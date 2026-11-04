import type { PhotoRef, PlaceDetails, PlaceSummary } from '@/types/place';
import { boundingBox, distanceMeters } from '@/utils/geo';
import { describeOpenState } from '@/utils/opening-hours';
import { searchTokens } from '@/utils/text';

import { TtlCache } from './cache';
import { PlacesError, type PlacesErrorKind } from './errors';
import {
  mapOsmElement,
  OSM_AMENITIES,
  osmSearchText,
  parseOsmId,
  withoutPlaceWords,
} from './osm-mapping';
import type { OverpassElement, OverpassResponse } from './osm-types';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';
import { matchesQuery } from './query-filter';

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/**
 * Öffentliche Overpass-Server, der Reihe nach probiert. Ist einer überlastet
 * (Warteschlange, 429, 5xx, keine Antwort), übernimmt der nächste.
 */
export const OVERPASS_ENDPOINTS = [
  OVERPASS_ENDPOINT,
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Server-seitiges Zeitlimit; muss unter dem Zeitlimit der App liegen. */
const SERVER_TIMEOUT_S = 15;

/** Bei diesen Fehlern lohnt sich ein anderer Server; bei fehlerhaften Anfragen nicht. */
const RETRY_ON_OTHER_SERVER: PlacesErrorKind[] = ['network', 'timeout', 'quota', 'server'];

/** Größere Umkreise würden in Berlin Tausende Lokale laden. */
export const OSM_MAX_RADIUS_METERS = 5000;

export type OverpassProviderOptions = {
  /** Server in Probier-Reihenfolge (Standard: OVERPASS_ENDPOINTS). */
  endpoints?: string[];
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  /** Wie lange ein geladenes Gebiet wiederverwendet wird. */
  areaTtlMs?: number;
  /**
   * Vorab erzeugter Datensatz aller Berliner Lokale (siehe scripts/fetch-osm-berlin.mjs).
   * Wird einmal geladen und lokal durchsucht; ohne ihn fragt die App live bei Overpass.
   */
  datasetUrl?: string | null;
  /** Zeitlimit für den Datensatz-Download. */
  datasetTimeoutMs?: number;
  pageSize?: number;
  now?: () => Date;
};

type OsmEntry = { place: PlaceDetails; text: string };

/** Nach einem Fehlschlag den Datensatz so lange nicht erneut versuchen (dann live). */
const DATASET_RETRY_MS = 5 * 60_000;

/**
 * Overpass-Abfrage für alle Gastronomie-Orte mit Namen im Umkreis.
 * Die globale Box `[bbox:…]` zwingt den Server, nur im Gebiet zu suchen (schnell),
 * `around` schneidet danach exakt auf den Kreis zu. `qt` spart die Sortierung.
 */
export function buildAreaQuery(lat: number, lon: number, radiusMeters: number): string {
  const around = `(around:${Math.round(radiusMeters)},${lat.toFixed(6)},${lon.toFixed(6)})`;
  const { low, high } = boundingBox({ latitude: lat, longitude: lon }, radiusMeters);
  const bbox = [low.latitude, low.longitude, high.latitude, high.longitude]
    .map((n) => n.toFixed(5))
    .join(',');
  return [
    `[out:json][timeout:${SERVER_TIMEOUT_S}][bbox:${bbox}];`,
    '(',
    `  nwr["amenity"~"^(${OSM_AMENITIES.join('|')})$"]["name"]${around};`,
    `  nwr["shop"="bakery"]["name"]${around};`,
    ');',
    'out center tags qt;',
  ].join('\n');
}

export function buildElementQuery(type: OverpassElement['type'], id: number): string {
  return `[out:json][timeout:${SERVER_TIMEOUT_S}];\n${type}(${id});\nout center tags;`;
}

/**
 * OpenStreetMap über die Overpass API. Liefert keine Bewertungen, Preise, Fotos oder
 * Rezensionen – dafür u. a. vegane Angebote. Daten unter ODbL, Quellenangabe Pflicht.
 */
export class OverpassPlacesProvider implements PlacesProvider {
  readonly source = 'osm' as const;

  private readonly endpoints: string[];
  /** Zuletzt funktionierender Server – wird zuerst gefragt. */
  private preferred = 0;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly pageSize: number;
  private readonly now: () => Date;
  private readonly areas: TtlCache<OsmEntry[]>;
  private readonly areaRequests = new Map<string, Promise<OsmEntry[]>>();
  /** Zuletzt gesehene Orte – Details ohne erneute Abfrage. */
  private readonly known = new Map<string, PlaceDetails>();
  private readonly datasetUrl: string | null;
  private readonly datasetTimeoutMs: number;
  private dataset: Promise<OsmEntry[]> | null = null;
  private datasetById = new Map<string, PlaceDetails>();
  private datasetFailedAt = 0;

  constructor(options: OverpassProviderOptions = {}) {
    this.endpoints = options.endpoints?.length ? options.endpoints : OVERPASS_ENDPOINTS;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    // Etwas über dem Server-Limit; danach übernimmt der nächste Server.
    this.timeoutMs = options.timeoutMs ?? (SERVER_TIMEOUT_S + 5) * 1000;
    this.pageSize = options.pageSize ?? 20;
    this.now = options.now ?? (() => new Date());
    this.areas = new TtlCache(options.areaTtlMs ?? 10 * 60_000, 20);
    this.datasetUrl = options.datasetUrl ?? null;
    this.datasetTimeoutMs = options.datasetTimeoutMs ?? 30_000;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const radius = Math.min(query.radiusMeters, OSM_MAX_RADIUS_METERS);
    const entries = await this.loadArea(query.center.latitude, query.center.longitude, radius);
    const tokens = withoutPlaceWords(searchTokens(query.text));
    // Bewertungen und Preise gibt es in OSM nicht – diese Bedingungen nie anwenden.
    const conditions: SearchQuery = {
      ...query,
      radiusMeters: radius,
      minRating: undefined,
      priceLevels: undefined,
    };

    const matches = entries
      .filter((e) => tokens.every((t) => e.text.includes(t)))
      .map((e) => this.withOpenNow(e.place))
      .filter((p) => matchesQuery(p, conditions))
      // OSM kennt keine Relevanz → nach Entfernung zum Suchmittelpunkt.
      .map((p) => ({ p, d: distanceMeters(query.center, p.location) }))
      .sort((a, b) => a.d - b.d)
      .map(({ p }) => p);

    const offset = query.pageToken ? Number.parseInt(query.pageToken, 10) || 0 : 0;
    const next = offset + this.pageSize;
    return {
      places: matches.slice(offset, next).map(toSummary),
      nextPageToken: next < matches.length ? String(next) : null,
    };
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    const known = this.known.get(id) ?? this.datasetById.get(id);
    if (known) return this.withOpenNow(known);
    // Favoriten: zuerst im Datensatz nachsehen, das spart eine langsame Live-Abfrage.
    if (await this.loadDataset()) {
      const fromDataset = this.datasetById.get(id);
      if (fromDataset) return this.withOpenNow(fromDataset);
    }
    const ref = parseOsmId(id);
    if (!ref) throw new PlacesError('not_found', `Keine OSM-ID: ${id}`);
    const response = await this.request(buildElementQuery(ref.type, ref.id));
    const place = (response.elements ?? []).map(mapOsmElement).find((p) => p?.id === id);
    if (!place) throw new PlacesError('not_found', `OSM-Ort nicht gefunden: ${id}`, 404);
    this.remember(place);
    return this.withOpenNow(place);
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    return toSummary(await this.getDetails(id));
  }

  getPhotoUrl(_photo: PhotoRef, _maxWidthPx: number): string | null {
    return null; // OSM hat keine Fotos
  }

  private async loadArea(lat: number, lon: number, radius: number): Promise<OsmEntry[]> {
    const all = await this.loadDataset();
    if (all) {
      const center = { latitude: lat, longitude: lon };
      const { low, high } = boundingBox(center, radius);
      // Erst grob per Box (schnell), den genauen Kreis prüft matchesQuery.
      return all.filter(({ place: { location: l } }) => {
        return (
          l.latitude >= low.latitude &&
          l.latitude <= high.latitude &&
          l.longitude >= low.longitude &&
          l.longitude <= high.longitude
        );
      });
    }
    return this.loadAreaLive(lat, lon, radius);
  }

  /** Datensatz einmal laden; `null`, wenn keiner konfiguriert oder er gerade nicht erreichbar ist. */
  private async loadDataset(): Promise<OsmEntry[] | null> {
    if (!this.datasetUrl) return null;
    if (Date.now() - this.datasetFailedAt < DATASET_RETRY_MS) return null;
    if (!this.dataset) {
      this.dataset = this.fetchDataset(this.datasetUrl).catch((error: unknown) => {
        console.warn('OSM-Datensatz nicht verfügbar, frage live', error);
        this.datasetFailedAt = Date.now();
        this.dataset = null;
        return [];
      });
    }
    const entries = await this.dataset;
    return entries.length ? entries : null;
  }

  private async fetchDataset(url: string): Promise<OsmEntry[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.datasetTimeoutMs);
    try {
      const response = await this.fetchFn(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { elements?: OverpassElement[] };
      if (!Array.isArray(data.elements) || data.elements.length === 0) {
        throw new Error('Datensatz leer oder ungültig');
      }
      const entries: OsmEntry[] = [];
      const byId = new Map<string, PlaceDetails>();
      for (const el of data.elements) {
        const place = mapOsmElement(el);
        if (!place) continue;
        byId.set(place.id, place);
        entries.push({ place, text: osmSearchText(place, el) });
      }
      this.datasetById = byId;
      return entries;
    } finally {
      clearTimeout(timer);
    }
  }

  private loadAreaLive(lat: number, lon: number, radius: number): Promise<OsmEntry[]> {
    // ~10 m Raster, damit kleine GPS-Schwankungen dasselbe Gebiet treffen.
    const key = `${lat.toFixed(4)},${lon.toFixed(4)},${radius}`;
    const cached = this.areas.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.areaRequests.get(key);
    if (pending) return pending;

    const promise = this.request(buildAreaQuery(lat, lon, radius))
      .then((response) => {
        const entries: OsmEntry[] = [];
        for (const el of response.elements ?? []) {
          const place = mapOsmElement(el);
          if (!place) continue;
          this.remember(place);
          entries.push({ place, text: osmSearchText(place, el) });
        }
        this.areas.set(key, entries);
        return entries;
      })
      .finally(() => this.areaRequests.delete(key));
    this.areaRequests.set(key, promise);
    return promise;
  }

  private remember(place: PlaceDetails) {
    if (this.known.size > 5000) this.known.clear();
    this.known.set(place.id, place);
  }

  /** Öffnungsstatus immer zum aktuellen Zeitpunkt berechnen (Daten sind bis 10 Min. alt). */
  private withOpenNow(place: PlaceDetails): PlaceDetails {
    if (!place.openingHours) return place;
    const openNow = describeOpenState(place.openingHours.periods, this.now())?.open ?? null;
    return { ...place, openNow, openingHours: { ...place.openingHours, openNow } };
  }

  /** Fragt die Server der Reihe nach, beginnend mit dem zuletzt funktionierenden. */
  private async request(query: string): Promise<OverpassResponse> {
    let lastError: PlacesError | undefined;
    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const index = (this.preferred + attempt) % this.endpoints.length;
      try {
        const data = await this.requestFrom(this.endpoints[index]!, query);
        this.preferred = index;
        return data;
      } catch (error) {
        if (!(error instanceof PlacesError) || !RETRY_ON_OTHER_SERVER.includes(error.kind)) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError ?? new PlacesError('server', 'Kein Overpass-Server erreichbar');
  }

  private async requestFrom(endpoint: string, query: string): Promise<OverpassResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new PlacesError('timeout', 'Zeitüberschreitung bei der Overpass-Anfrage');
      }
      throw new PlacesError('network', error instanceof Error ? error.message : 'Netzwerkfehler');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const kind: PlacesErrorKind =
        response.status === 429
          ? 'quota'
          : response.status === 504
            ? 'timeout'
            : response.status >= 500
              ? 'server'
              : 'invalid_request';
      throw new PlacesError(kind, `Overpass HTTP ${response.status}`, response.status);
    }

    let data: OverpassResponse;
    try {
      data = (await response.json()) as OverpassResponse;
    } catch {
      throw new PlacesError('server', 'Overpass-Antwort konnte nicht gelesen werden');
    }
    // Laufzeitfehler meldet Overpass mit HTTP 200 und einem Hinweis.
    if (data.remark && /error|timed out/i.test(data.remark) && !data.elements?.length) {
      throw new PlacesError('timeout', data.remark);
    }
    return data;
  }
}

function toSummary(p: PlaceDetails): PlaceSummary {
  return {
    id: p.id,
    source: p.source,
    name: p.name,
    primaryType: p.primaryType,
    typeLabel: p.typeLabel,
    types: p.types,
    location: p.location,
    shortAddress: p.shortAddress,
    rating: p.rating,
    ratingCount: p.ratingCount,
    priceLevel: p.priceLevel,
    openNow: p.openNow,
    businessStatus: p.businessStatus,
    photo: p.photo,
    attributes: p.attributes,
  };
}
