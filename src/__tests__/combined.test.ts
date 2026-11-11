import { enrichWithOsm, findMatch, nameTokens, namesMatch } from '@/services/places/combine';
import { CombinedPlacesProvider } from '@/services/places/combined-provider';
import { PlacesError } from '@/services/places/errors';
import { MOCK_PLACES } from '@/services/places/mock-data';
import type { PlacesProvider, SearchQuery, SearchResult } from '@/services/places/provider';
import { EMPTY_ATTRIBUTES, type PlaceDetails, type PlaceSummary } from '@/types/place';

const BASE = MOCK_PLACES[0]!;
const place = (
  id: string,
  name: string,
  lat: number,
  lon: number,
  patch: Partial<PlaceSummary> = {},
): PlaceSummary => ({
  ...BASE,
  id,
  name,
  source: id.startsWith('osm:') ? 'osm' : 'google',
  location: { latitude: lat, longitude: lon },
  attributes: { ...EMPTY_ATTRIBUTES },
  cuisines: [],
  periods: null,
  photo: null,
  ...patch,
});

// ~11 m pro 0,0001° Breite
const G_RAMEN = place('ChIJramen', 'Nudelwerk Ramen', 52.5, 13.4, {
  rating: 4.6,
  attributes: { ...EMPTY_ATTRIBUTES, vegetarian: true },
  cuisines: ['ramen'],
});
const O_RAMEN = place('osm:node/1', 'Nudelwerk', 52.5002, 13.4001, {
  rating: null,
  attributes: { ...EMPTY_ATTRIBUTES, vegetarian: false, vegan: true, wifi: true },
  cuisines: ['japanese'],
});
const O_OTHER = place('osm:node/2', 'Döner Palast', 52.5001, 13.4, { rating: null });
const O_FAR = place('osm:node/3', 'Nudelwerk', 52.51, 13.4, { rating: null });

describe('Namensvergleich', () => {
  it('ignoriert Groß-/Kleinschreibung, Akzente und Allerweltswörter', () => {
    expect(nameTokens('Café Krone – Berlin')).toEqual(['krone']);
    expect(namesMatch('Café Krone', 'Krone')).toBe(true);
    expect(namesMatch('Nudelwerk Ramen', 'Nudelwerk')).toBe(true);
    expect(namesMatch('Pizzeria Da Mario', 'Da Mario')).toBe(true);
    expect(namesMatch('Restaurant Lindenbräu', 'Lindenbrau')).toBe(true);
  });

  it('erkennt Tippfehler, aber nicht verschiedene Lokale', () => {
    expect(namesMatch('Tadshikische Teestube', 'Tadschikische Teestube')).toBe(true);
    expect(namesMatch('Nudelwerk', 'Döner Palast')).toBe(false);
    expect(namesMatch('Restaurant', 'Café')).toBe(false); // nur Allerweltswörter
    expect(namesMatch('Bar 3', 'Bar 7')).toBe(false);
  });
});

describe('findMatch', () => {
  it('findet das nahe Lokal mit passendem Namen', () => {
    expect(findMatch(G_RAMEN, [O_OTHER, O_RAMEN, O_FAR])?.id).toBe('osm:node/1');
  });

  it('nicht bei zu großer Entfernung oder schon vergeben', () => {
    expect(findMatch(G_RAMEN, [O_FAR])).toBeNull();
    expect(findMatch(G_RAMEN, [O_RAMEN], new Set(['osm:node/1']))).toBeNull();
  });
});

describe('enrichWithOsm', () => {
  it('Google hat Vorrang, OSM füllt Lücken, Küchen werden vereinigt', () => {
    const merged = enrichWithOsm(G_RAMEN, O_RAMEN);
    expect(merged.id).toBe('ChIJramen');
    expect(merged.source).toBe('google');
    expect(merged.rating).toBe(4.6);
    expect(merged.attributes.vegetarian).toBe(true); // Google gewinnt
    expect(merged.attributes.vegan).toBe(true); // von OSM
    expect(merged.attributes.wifi).toBe(true);
    expect(merged.cuisines).toEqual(['ramen', 'japanese']);
  });

  it('ohne OSM-Gegenstück bleibt alles, wie es ist', () => {
    expect(enrichWithOsm(G_RAMEN, null)).toBe(G_RAMEN);
  });
});

/** Einfacher Anbieter über einer festen Liste, 2 Treffer pro Seite. */
function fakeProvider(
  places: PlaceSummary[],
  fail?: PlacesError,
): PlacesProvider & {
  search: jest.Mock;
} {
  const search = jest.fn(async (q: SearchQuery): Promise<SearchResult> => {
    if (fail) throw fail;
    const offset = q.pageToken ? Number(q.pageToken) : 0;
    const next = offset + 2;
    return {
      places: places.slice(offset, next),
      nextPageToken: next < places.length ? String(next) : null,
    };
  });
  return {
    source: places[0]?.source ?? 'google',
    search,
    getDetails: async (id) => places.find((p) => p.id === id) as PlaceDetails,
    getSummary: async (id) => places.find((p) => p.id === id)!,
    getPhotoUrl: () => null,
  };
}

async function allPages(provider: PlacesProvider, query: SearchQuery): Promise<PlaceSummary[]> {
  const out: PlaceSummary[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 20; i++) {
    const r = await provider.search({ ...query, pageToken });
    out.push(...r.places);
    if (!r.nextPageToken) break;
    pageToken = r.nextPageToken;
  }
  return out;
}

const QUERY: SearchQuery = { center: { latitude: 52.5, longitude: 13.4 }, radiusMeters: 1500 };
const G_CAFE = place('ChIJcafe', 'Kaffeebar Krone', 52.501, 13.401, { rating: 4.2 });
const O_CAFE = place('osm:node/9', 'Krone', 52.5011, 13.4011, {
  rating: null,
  attributes: { ...EMPTY_ATTRIBUTES, smokeFree: true },
});

describe('CombinedPlacesProvider', () => {
  it('liefert Google-Treffer mit OSM-Angaben, danach nur-OSM-Lokale ohne Doppelte', async () => {
    const google = fakeProvider([G_RAMEN, G_CAFE]);
    const osm = fakeProvider([O_RAMEN, O_OTHER, O_CAFE]);
    const combined = new CombinedPlacesProvider(google, osm);

    const places = await allPages(combined, QUERY);
    expect(places.map((p) => p.id)).toEqual(['ChIJramen', 'ChIJcafe', 'osm:node/2']);
    expect(places[0]!.attributes.vegan).toBe(true);
    expect(places[1]!.attributes.smokeFree).toBe(true);
    expect(combined.source).toBe('combined');
  });

  it('mit Bewertungs- oder Preisfilter keine OSM-only-Lokale (die haben beides nicht)', async () => {
    const combined = new CombinedPlacesProvider(
      fakeProvider([G_RAMEN]),
      fakeProvider([O_RAMEN, O_OTHER]),
    );
    const places = await allPages(combined, { ...QUERY, minRating: 4 });
    expect(places.map((p) => p.id)).toEqual(['ChIJramen']);
  });

  it('fällt Google aus, sucht die App nur mit OSM weiter', async () => {
    const combined = new CombinedPlacesProvider(
      fakeProvider([], new PlacesError('quota', 'Kein Guthaben')),
      fakeProvider([O_RAMEN, O_OTHER]),
    );
    const places = await allPages(combined, QUERY);
    expect(places.map((p) => p.id)).toEqual(['osm:node/1', 'osm:node/2']);
  });

  it('Details eines Google-Orts werden um OSM-Angaben ergänzt', async () => {
    const combined = new CombinedPlacesProvider(
      fakeProvider([G_RAMEN]),
      fakeProvider([O_RAMEN, O_OTHER]),
    );
    const details = await combined.getDetails('ChIJramen');
    expect(details.attributes.vegan).toBe(true);
    expect(details.rating).toBe(4.6);
  });
});

describe('Kombi: OSM-Lokale zwischen den Google-Seiten (Teilkreise)', () => {
  const CENTER = { latitude: 52.5, longitude: 13.4 };
  const Q: SearchQuery = { center: CENTER, radiusMeters: 1500 };
  // Ring-Teilkreis 0° liegt ~1125 m nördlich.
  const north = (m: number) => 52.5 + m / 111_320;
  const G_TWIN = place('ChIJtwin', 'Zwillingsbar', north(1150), 13.4, { rating: 4.4 });
  const O_TWIN = place('osm:node/50', 'Zwillingsbar', north(1160), 13.4, { rating: null });
  const O_CENTER = place('osm:node/51', 'Mittelimbiss', 52.5, 13.4001, { rating: null });

  /** Google-Attrappe: Seite i = Teilkreis i, liefert die Orte in diesem Kreis. */
  function cellGoogle(all: PlaceSummary[]): PlacesProvider {
    const { searchCells } = jest.requireActual('@/services/places/search-cells');
    return {
      source: 'google',
      search: async (q: SearchQuery) => {
        const cells = searchCells(q.center, q.radiusMeters);
        const i = q.pageToken ? Number(q.pageToken) : 0;
        const cell = cells[i];
        const { distanceMeters } = jest.requireActual('@/utils/geo');
        return {
          places:
            i === 0
              ? []
              : all.filter((p) => distanceMeters(p.location, cell.center) <= cell.radiusMeters),
          nextPageToken: i + 1 < cells.length ? String(i + 1) : null,
        };
      },
      getDetails: async (id) => all.find((p) => p.id === id) as PlaceDetails,
      getSummary: async (id) => all.find((p) => p.id === id)!,
      getPhotoUrl: () => null,
    };
  }

  it('Mittel-Lokal kommt früh, Zwilling erscheint nur einmal (zusammengeführt)', async () => {
    const combined = new CombinedPlacesProvider(
      cellGoogle([G_TWIN]),
      fakeProvider([O_CENTER, O_TWIN]),
    );
    const pages: string[][] = [];
    let token: string | undefined;
    for (let i = 0; i < 20; i++) {
      const r = await combined.search({ ...Q, pageToken: token });
      pages.push(r.places.map((p) => p.id));
      if (!r.nextPageToken) break;
      token = r.nextPageToken;
    }
    const all = pages.flat();
    // Nach Seite 2 (Mitte) ist das Mittel-Lokal sicher – nicht erst am Ende.
    expect(pages[1]).toContain('osm:node/51');
    expect(all.filter((id) => id === 'osm:node/51')).toHaveLength(1);
    // Der OSM-Zwilling steht nie allein in der Liste, nur als Google-Ort.
    expect(all).not.toContain('osm:node/50');
    expect(all.filter((id) => id === 'ChIJtwin').length).toBeGreaterThan(0);
  });
});

describe('Kombi: OSM-Lokal öffnen holt Google-Daten', () => {
  it('sucht einmal bei Google, merkt sich die place_id und zeigt Bewertung', async () => {
    const lookup = jest.fn(async () => [
      { id: 'ChIJother', name: 'Ganz anders', location: G_RAMEN.location },
      { id: 'ChIJramen', name: 'Nudelwerk Ramen', location: G_RAMEN.location },
    ]);
    const links = new Map<string, string>();
    const combined = new CombinedPlacesProvider(
      fakeProvider([G_RAMEN]),
      fakeProvider([O_RAMEN, O_OTHER]),
      { lookup, links: { get: (k) => links.get(k), set: (k, v) => void links.set(k, v) } },
    );

    const details = await combined.getDetails('osm:node/1');
    expect(details.id).toBe('osm:node/1'); // ID bleibt (Favoriten, Navigation)
    expect(details.source).toBe('google');
    expect(details.rating).toBe(4.6);
    expect(details.attributes.vegan).toBe(true); // OSM-Angabe bleibt
    expect(links.get('osm:node/1')).toBe('ChIJramen');

    await combined.getDetails('osm:node/1');
    expect(lookup).toHaveBeenCalledTimes(1); // beim zweiten Mal aus dem Speicher
  });

  it('ohne passenden Google-Eintrag bleibt es beim OSM-Lokal', async () => {
    const combined = new CombinedPlacesProvider(
      fakeProvider([G_RAMEN]),
      fakeProvider([O_RAMEN, O_OTHER]),
      { lookup: async () => [{ id: 'ChIJx', name: 'Etwas anderes', location: O_OTHER.location }] },
    );
    const details = await combined.getDetails('osm:node/2');
    expect(details.source).toBe('osm');
    expect(details.id).toBe('osm:node/2');
  });

  it('Kurzdaten von OSM-Lokalen (Favoritenliste) ohne Google-Abfrage', async () => {
    const lookup = jest.fn(async () => []);
    const combined = new CombinedPlacesProvider(fakeProvider([G_RAMEN]), fakeProvider([O_RAMEN]), {
      lookup,
    });
    expect((await combined.getSummary('osm:node/1')).source).toBe('osm');
    expect(lookup).not.toHaveBeenCalled();
  });
});
