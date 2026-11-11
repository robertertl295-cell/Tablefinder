import type { LatLng, PhotoRef, PlaceDetails, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

import { searchCacheKey } from './cached-provider';
import { enrichWithOsm, findMatch, MATCH_MAX_METERS, namesMatch } from './combine';
import { isPlacesError } from './errors';
import { isOsmId } from './osm-mapping';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';
import { matchesQuery } from './query-filter';
import { searchCells } from './search-cells';

/** Google-Kandidaten zu einem Namen in der Nähe (nur ID, Name, Lage). */
export type GoogleLookup = (
  name: string,
  location: LatLng,
) => Promise<{ id: string; name: string; location: LatLng }[]>;

/** Dauerhafte Zuordnung OSM-ID → Google-place_id (nur IDs). */
export type PlaceLinks = {
  get: (osmId: string) => string | undefined;
  set: (osmId: string, googleId: string) => void;
};

export type CombinedOptions = { lookup?: GoogleLookup; links?: PlaceLinks };

/** Wie viele OSM-Seiten höchstens für die Kandidatenliste geladen werden (lokal, kostenlos). */
const MAX_CANDIDATE_PAGES = 100;
/** Gemerkte Suchen (für Seitenwechsel); ältere fallen heraus. */
const MAX_SESSIONS = 20;

type Session = {
  /** Alle OSM-Orte im Suchkreis – Kandidaten für das Zusammenführen. */
  candidates: Promise<PlaceSummary[]>;
  /** OSM-IDs, die schon einem Google-Ort zugeordnet sind. */
  taken: Set<string>;
  /** OSM-Lokale ohne Google-Gegenstück, die schon zwischen den Google-Seiten kamen. */
  emitted: Set<string>;
};

type Phase = 'g' | 'o';
type Token = { phase: Phase; inner?: string };

const encode = (t: Token) => JSON.stringify(t);
function decode(token: string | undefined): Token {
  if (!token) return { phase: 'g' };
  try {
    const t = JSON.parse(token) as Token;
    return t.phase === 'o' ? t : { phase: 'g', inner: t.inner };
  } catch {
    return { phase: 'g' };
  }
}

/**
 * „Google + OpenStreetMap“:
 * 1. Google-Treffer (Bewertungen, Fotos, Rezensionen), ergänzt um OSM-Angaben desselben Lokals
 *    (vegan, glutenfrei, WLAN …),
 * 2. danach Lokale, die nur OSM kennt (nach Entfernung).
 * Mit Bewertungs- oder Preisfilter entfällt Teil 2 – OSM-Lokale haben beides nicht.
 * Fällt Google aus (Key abgelehnt, Guthaben leer, Netz), liefert die Suche nur OSM.
 * Kostet keine zusätzlichen Google-Abfragen; OSM läuft auf dem Gerät.
 */
export class CombinedPlacesProvider implements PlacesProvider {
  readonly source = 'combined' as const;
  private readonly sessions = new Map<string, Session>();
  /** Google-ID → OSM-ID (nur IDs, keine Google-Inhalte). */
  private readonly matches = new Map<string, string | null>();
  /** OSM-Lokale, für die Google in dieser Sitzung nichts gefunden hat. */
  private readonly noGoogle = new Set<string>();

  constructor(
    private readonly google: PlacesProvider,
    private readonly osm: PlacesProvider,
    private readonly options: CombinedOptions = {},
  ) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const token = decode(query.pageToken);
    const session = this.session(query);
    if (token.phase === 'g') {
      try {
        const result = await this.google.search({ ...query, pageToken: token.inner });
        const candidates = await session.candidates.catch(() => [] as PlaceSummary[]);
        const used = new Set([...session.taken, ...session.emitted]);
        const places = result.places.map((p) => {
          const match = findMatch(p, candidates, used);
          this.matches.set(p.id, match?.id ?? null);
          if (match) {
            session.taken.add(match.id);
            used.add(match.id);
          }
          return enrichWithOsm(p, match);
        });
        places.push(...this.osmBetween(query, session, candidates, token.inner));
        const next: Token | null = result.nextPageToken
          ? { phase: 'g', inner: result.nextPageToken }
          : osmOnlyAllowed(query)
            ? { phase: 'o' }
            : null;
        return { places, nextPageToken: next ? encode(next) : null };
      } catch (error) {
        // Ohne Google: weiter mit OSM, statt die Suche scheitern zu lassen.
        if (token.inner || !isPlacesError(error)) throw error;
        return this.osmOnly(query, session, undefined);
      }
    }
    return this.osmOnly(query, session, token.inner);
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    if (isOsmId(id)) return this.osmWithGoogle(id);
    const details = await this.google.getDetails(id);
    return enrichWithOsm(details, await this.osmMatchFor(details));
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    // OSM-Kurzdaten (z. B. Favoritenliste) ohne Google-Abfrage – das wäre bei jeder Liste teuer.
    if (isOsmId(id)) return this.osm.getSummary(id);
    const summary = await this.google.getSummary(id);
    return enrichWithOsm(summary, await this.osmMatchFor(summary));
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    return this.google.getPhotoUrl(photo, maxWidthPx);
  }

  /**
   * OSM-Lokale ohne Google-Gegenstück schon zwischen den Google-Seiten zeigen, statt erst
   * ganz am Ende. Sicher ist ein OSM-Lokal erst, wenn kein noch ausstehender Teilkreis
   * (inkl. Zuordnungsabstand) es erreicht – sonst könnte Google es später noch liefern
   * und es stünde doppelt in der Liste. Nur bei der Umgebungssuche (Teilkreise).
   */
  private osmBetween(
    query: SearchQuery,
    session: Session,
    candidates: PlaceSummary[],
    googleToken: string | undefined,
  ): PlaceSummary[] {
    if (query.text?.trim() || !osmOnlyAllowed(query)) return [];
    const cells = searchCells(query.center, query.radiusMeters);
    const index = googleToken ? Number.parseInt(googleToken, 10) : 0;
    const pending = cells.slice(index + 1);
    if (pending.length === 0) return []; // den Rest übernimmt die OSM-Phase (seitenweise)
    const conditions = { ...query, minRating: undefined, priceLevels: undefined };
    const extra = candidates
      .filter((c) => !session.taken.has(c.id) && !session.emitted.has(c.id))
      .filter((c) =>
        pending.every(
          (cell) => distanceMeters(c.location, cell.center) > cell.radiusMeters + MATCH_MAX_METERS,
        ),
      )
      .filter((c) => matchesQuery(c, conditions))
      .sort(
        (a, b) =>
          distanceMeters(query.center, a.location) - distanceMeters(query.center, b.location),
      );
    for (const c of extra) session.emitted.add(c.id);
    return extra;
  }

  /**
   * OSM-Lokal öffnen: einmal bei Google nach dem passenden Eintrag suchen und dann dessen
   * Bewertung, Fotos und Rezensionen zeigen (ergänzt um die OSM-Angaben). Die Zuordnung
   * (nur die place_id) wird gemerkt. Ohne Treffer bleibt es beim OSM-Eintrag.
   */
  private async osmWithGoogle(id: string): Promise<PlaceDetails> {
    const osm = await this.osm.getDetails(id);
    const googleId = await this.googleIdFor(osm);
    if (!googleId) return osm;
    try {
      const google = await this.google.getDetails(googleId);
      this.matches.set(googleId, id);
      // ID bleibt die OSM-ID (Favoriten, Navigation); Inhalte und Quelle sind Google.
      return { ...enrichWithOsm(google, osm), id };
    } catch {
      return osm;
    }
  }

  private async googleIdFor(place: PlaceSummary): Promise<string | null> {
    const known = this.options.links?.get(place.id);
    if (known) return known;
    if (!this.options.lookup || this.noGoogle.has(place.id)) return null;
    try {
      const candidates = await this.options.lookup(place.name, place.location);
      const best = candidates
        .map((c) => ({ c, d: distanceMeters(c.location, place.location) }))
        .filter(({ c, d }) => d <= MATCH_MAX_METERS && namesMatch(c.name, place.name))
        .sort((a, b) => a.d - b.d)[0]?.c;
      if (!best) {
        this.noGoogle.add(place.id);
        return null;
      }
      this.options.links?.set(place.id, best.id);
      return best.id;
    } catch {
      return null; // z. B. kein Guthaben – dann eben ohne Google-Daten
    }
  }

  /** OSM-Lokale ohne Google-Gegenstück, seitenweise; leere Seiten werden übersprungen. */
  private async osmOnly(
    query: SearchQuery,
    session: Session,
    inner: string | undefined,
  ): Promise<SearchResult> {
    let pageToken = inner;
    for (let i = 0; i < MAX_CANDIDATE_PAGES; i++) {
      const result = await this.osm.search({
        ...query,
        minRating: undefined,
        priceLevels: undefined,
        pageToken,
      });
      const places = result.places.filter(
        (p) => !session.taken.has(p.id) && !session.emitted.has(p.id),
      );
      if (places.length > 0 || !result.nextPageToken) {
        return {
          places,
          nextPageToken: result.nextPageToken
            ? encode({ phase: 'o', inner: result.nextPageToken })
            : null,
        };
      }
      pageToken = result.nextPageToken;
    }
    return { places: [], nextPageToken: null };
  }

  private session(query: SearchQuery): Session {
    const key = searchCacheKey({ ...query, pageToken: undefined });
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        candidates: this.allOsm({ center: query.center, radiusMeters: query.radiusMeters }),
        taken: new Set(),
        emitted: new Set(),
      };
      this.sessions.set(key, session);
      if (this.sessions.size > MAX_SESSIONS) {
        this.sessions.delete(this.sessions.keys().next().value!);
      }
    }
    return session;
  }

  /** Alle OSM-Gastro-Orte in einem Kreis (ohne Text-, Kategorie- oder Öffnungsfilter). */
  private async allOsm(query: SearchQuery): Promise<PlaceSummary[]> {
    const all: PlaceSummary[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < MAX_CANDIDATE_PAGES; i++) {
      const result = await this.osm.search({ ...query, pageToken });
      all.push(...result.places);
      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }
    return all;
  }

  /** OSM-Gegenstück eines Google-Orts (aus der Suche bekannt oder in der Nähe gesucht). */
  private async osmMatchFor(place: PlaceSummary): Promise<PlaceSummary | null> {
    try {
      let osmId = this.matches.get(place.id);
      if (osmId === undefined) {
        const nearby = await this.allOsm({
          center: place.location,
          radiusMeters: MATCH_MAX_METERS,
        });
        osmId = findMatch(place, nearby)?.id ?? null;
        this.matches.set(place.id, osmId);
      }
      return osmId ? await this.osm.getSummary(osmId) : null;
    } catch {
      return null; // OSM ist nur Ergänzung – ohne sie bleibt der Google-Ort, wie er ist.
    }
  }
}

function osmOnlyAllowed(query: SearchQuery): boolean {
  return !query.minRating && !(query.priceLevels && query.priceLevels.length > 0);
}
