import { readFileSync } from 'fs';
import { join } from 'path';

import { PlacesError } from '@/services/places/errors';
import {
  buildAreaQuery,
  OSM_MAX_RADIUS_METERS,
  OverpassPlacesProvider,
} from '@/services/places/overpass-provider';
import type { SearchQuery } from '@/services/places/provider';

import { OSM_AREA, OSM_RAMEN } from '../fixtures/overpass';

const KREUZBERG = { latitude: 52.4986, longitude: 13.4203 };
const QUERY: SearchQuery = { center: KREUZBERG, radiusMeters: 1500 };
// Dienstag, 3. November 2026, 13:00
const NOW = new Date(2026, 10, 3, 13, 0);

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as Response;
}

function setup(
  responder: (body: string) => Response | Promise<Response> = () =>
    jsonResponse({ elements: OSM_AREA }),
) {
  const bodies: string[] = [];
  const fetchFn = jest.fn((_url: string | URL | Request, init?: RequestInit) => {
    const body = decodeURIComponent(String(init?.body).replace(/^data=/, ''));
    bodies.push(body);
    return Promise.resolve(responder(body));
  }) as unknown as typeof fetch;
  const provider = new OverpassPlacesProvider({
    fetchFn,
    pageSize: 3,
    now: () => NOW,
    timeoutMs: 50,
  });
  return { provider, fetchFn, bodies };
}

const names = (r: { places: { name: string }[] }) => r.places.map((p) => p.name);

describe('Overpass-Abfrage', () => {
  it('fragt Gastronomie mit Namen im Umkreis ab', () => {
    const q = buildAreaQuery(52.4986, 13.4203, 1500);
    expect(q).toContain('[out:json]');
    expect(q).toContain(
      'nwr["amenity"~"^(restaurant|cafe|bar|pub|biergarten|fast_food|food_court|ice_cream)$"]["name"](around:1500,52.498600,13.420300)',
    );
    expect(q).toContain('nwr["shop"="bakery"]["name"]');
    expect(q).toContain('out center tags qt;');
  });

  it('begrenzt die Suche zusätzlich mit einer Box und einem kurzen Server-Limit', () => {
    const q = buildAreaQuery(52.4986, 13.4203, 1500);
    expect(q).toMatch(
      /^\[out:json\]\[timeout:15\]\[bbox:52\.48\d+,13\.39\d+,52\.51\d+,13\.44\d+\];/,
    );
    expect(q).toContain('out center tags qt;');
  });

  it('sendet POST mit Formular-Daten und begrenzt den Radius', async () => {
    const { provider, fetchFn, bodies } = setup();
    await provider.search({ ...QUERY, radiusMeters: 50_000 });
    const init = (fetchFn as jest.Mock).mock.calls[0][1] as RequestInit;
    expect((fetchFn as jest.Mock).mock.calls[0][0]).toBe('https://overpass-api.de/api/interpreter');
    expect(init.method).toBe('POST');
    expect(bodies[0]).toContain(`around:${OSM_MAX_RADIUS_METERS},`);
  });
});

describe('OverpassPlacesProvider.search', () => {
  it('liefert Treffer im Radius, nach Entfernung sortiert, seitenweise', async () => {
    const { provider } = setup();
    const page1 = await provider.search(QUERY);
    // Backstube (≈40 m) zuerst; ohne Namen und „Weit Weg“ fehlen
    expect(names(page1)).toEqual(['Backstube', 'Café am Ufer', 'Kebab Haus']);
    expect(page1.nextPageToken).toBe('3');
    const page2 = await provider.search({ ...QUERY, pageToken: '3' });
    expect(names(page2)).toEqual(['Eckkneipe', 'Ramen Yokai']);
    expect(page2.nextPageToken).toBeNull();
  });

  it('lädt ein Gebiet nur einmal (Cache) – auch für andere Suchbegriffe', async () => {
    const { provider, fetchFn } = setup();
    await provider.search(QUERY);
    await provider.search({ ...QUERY, text: 'ramen' });
    await provider.search({ ...QUERY, pageToken: '3' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('Freitext: Küche (deutsch), Diät, Umlaute; Ortsnamen werden ignoriert', async () => {
    const { provider } = setup();
    expect(names(await provider.search({ ...QUERY, text: 'vegan Kreuzberg' }))).toEqual([
      'Ramen Yokai',
    ]);
    expect(names(await provider.search({ ...QUERY, text: 'Kaffee' }))).toEqual(['Café am Ufer']);
    expect(names(await provider.search({ ...QUERY, text: 'Döner' }))).toEqual(['Kebab Haus']);
    expect(names(await provider.search({ ...QUERY, text: 'japanisch' }))).toEqual(['Ramen Yokai']);
  });

  it('wendet Kategorie und „jetzt geöffnet“ an (Dienstag 13:00)', async () => {
    const { provider } = setup();
    expect(names(await provider.search({ ...QUERY, category: 'cafe' }))).toEqual(['Café am Ufer']);
    const open = names(await provider.search({ ...QUERY, openNow: true }));
    expect(open).toEqual(['Backstube', 'Café am Ufer', 'Kebab Haus']);
    expect(open).not.toContain('Eckkneipe'); // Öffnungszeiten unbekannt
  });

  it('ignoriert Bewertungs- und Preisbedingungen (gibt es in OSM nicht)', async () => {
    const { provider } = setup();
    const r = await provider.search({ ...QUERY, minRating: 4.5, priceLevels: [1] });
    expect(r.places.length).toBeGreaterThan(0);
  });

  it('berechnet „jetzt geöffnet“ zum aktuellen Zeitpunkt', async () => {
    const { provider } = setup();
    const { places } = await provider.search({ ...QUERY, text: 'ramen' });
    expect(places[0]?.openNow).toBe(true);
  });
});

describe('Details', () => {
  it('kommen ohne neue Abfrage aus bekannten Treffern', async () => {
    const { provider, fetchFn } = setup();
    await provider.search(QUERY);
    const d = await provider.getDetails('osm:node:101');
    expect(d.name).toBe('Ramen Yokai');
    expect(d.openingHours?.openNow).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('werden sonst einzeln per ID geladen (z. B. für Favoriten)', async () => {
    const { provider, bodies } = setup(() => jsonResponse({ elements: [OSM_RAMEN] }));
    const s = await provider.getSummary('osm:node:101');
    expect(bodies[0]).toContain('node(101);');
    expect(s).not.toHaveProperty('reviews');
    expect(s.source).toBe('osm');
  });

  it('melden unbekannte Orte als not_found', async () => {
    const { provider } = setup(() => jsonResponse({ elements: [] }));
    await expect(provider.getDetails('osm:way:999')).rejects.toMatchObject({ kind: 'not_found' });
    await expect(provider.getDetails('ChIJ-google')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('hat keine Fotos', () => {
    const { provider } = setup();
    expect(
      provider.getPhotoUrl({ name: 'x', widthPx: null, heightPx: null, attributions: [] }, 100),
    ).toBeNull();
  });
});

describe('Ausweich-Server', () => {
  const ENDPOINTS = ['https://a.example/api', 'https://b.example/api', 'https://c.example/api'];
  function multi(responder: (url: string) => Response | Promise<Response>) {
    const urls: string[] = [];
    const fetchFn = jest.fn((url: string | URL | Request, init?: RequestInit) => {
      urls.push(String(url));
      // Wie echtes fetch: Abbruch über das Signal beendet die Anfrage.
      const aborted = new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      );
      return Promise.race([Promise.resolve(responder(String(url))), aborted]);
    }) as unknown as typeof fetch;
    const provider = new OverpassPlacesProvider({
      fetchFn,
      endpoints: ENDPOINTS,
      timeoutMs: 50,
      pageSize: 3,
      now: () => NOW,
    });
    return { provider, urls };
  }

  it('fragt bei Überlastung den nächsten Server und merkt sich den funktionierenden', async () => {
    const { provider, urls } = multi((url) =>
      url.includes('a.example') ? jsonResponse({}, 429) : jsonResponse({ elements: OSM_AREA }),
    );
    expect((await provider.search(QUERY)).places.length).toBeGreaterThan(0);
    expect(urls).toEqual([ENDPOINTS[0], ENDPOINTS[1]]);
    // nächste Anfrage (anderes Gebiet) direkt beim funktionierenden Server
    await provider.search({ ...QUERY, center: { latitude: 52.52, longitude: 13.4 } });
    expect(urls.at(-1)).toBe(ENDPOINTS[1]);
  });

  it('wechselt auch bei keiner Antwort (Zeitüberschreitung)', async () => {
    const { provider, urls } = multi((url) =>
      url.includes('a.example')
        ? new Promise<Response>(() => {}) // hängt
        : jsonResponse({ elements: OSM_AREA }),
    );
    expect((await provider.search(QUERY)).places.length).toBeGreaterThan(0);
    expect(urls).toEqual([ENDPOINTS[0], ENDPOINTS[1]]);
  });

  it('meldet den letzten Fehler, wenn alle Server versagen', async () => {
    const { provider, urls } = multi(() => jsonResponse({}, 504));
    await expect(provider.search(QUERY)).rejects.toMatchObject({ kind: 'timeout' });
    expect(urls).toHaveLength(3);
  });

  it('probiert bei einer fehlerhaften Anfrage keine anderen Server', async () => {
    const { provider, urls } = multi(() => jsonResponse({}, 400));
    await expect(provider.search(QUERY)).rejects.toMatchObject({ kind: 'invalid_request' });
    expect(urls).toHaveLength(1);
  });
});

describe('Fehler', () => {
  const kind = async (responder: Parameters<typeof setup>[0]) => {
    const { provider } = setup(responder);
    try {
      await provider.search(QUERY);
    } catch (e) {
      expect(e).toBeInstanceOf(PlacesError);
      return (e as PlacesError).kind;
    }
    throw new Error('kein Fehler');
  };

  it.each([
    [429, 'quota'],
    [504, 'timeout'],
    [500, 'server'],
    [400, 'invalid_request'],
  ] as const)('HTTP %i → %s', async (status, expected) => {
    expect(await kind(() => jsonResponse({}, status))).toBe(expected);
  });

  it('Laufzeitfehler mit HTTP 200 (remark)', async () => {
    expect(
      await kind(() =>
        jsonResponse({ elements: [], remark: 'runtime error: Query timed out in "query"' }),
      ),
    ).toBe('timeout');
  });

  it('Netzwerk und Zeitüberschreitung', async () => {
    expect(await kind(() => Promise.reject(new TypeError('Network request failed')))).toBe(
      'network',
    );
  });
});

describe('Datensatz statt Live-Abfrage', () => {
  const DATASET = '/Tablefinder/data/osm-berlin.json';

  function withDataset(datasetResponse: () => Response | Promise<Response>) {
    const urls: string[] = [];
    const fetchFn = jest.fn((url: string | URL | Request) => {
      urls.push(String(url));
      return Promise.resolve(
        String(url) === DATASET ? datasetResponse() : jsonResponse({ elements: OSM_AREA }),
      );
    }) as unknown as typeof fetch;
    const provider = new OverpassPlacesProvider({
      fetchFn,
      datasetUrl: DATASET,
      pageSize: 10,
      now: () => NOW,
    });
    return { provider, urls };
  }

  it('lädt den Datensatz einmal und sucht dann lokal – ohne Overpass', async () => {
    const { provider, urls } = withDataset(() => jsonResponse({ version: 1, elements: OSM_AREA }));
    const [a, b] = await Promise.all([
      provider.search(QUERY),
      provider.search({ ...QUERY, text: 'vegan' }),
    ]);
    expect(names(a)).toEqual([
      'Backstube',
      'Café am Ufer',
      'Kebab Haus',
      'Eckkneipe',
      'Ramen Yokai',
    ]);
    expect(names(b)).toEqual(['Ramen Yokai']);
    // anderes Gebiet: findet „Weit Weg“, weiterhin ohne neue Anfrage
    const north = await provider.search({
      ...QUERY,
      center: { latitude: 52.5295, longitude: 13.4203 },
      radiusMeters: 500,
    });
    expect(names(north)).toEqual(['Weit Weg']);
    expect(urls).toEqual([DATASET]);
  });

  it('liefert Details und Favoriten aus dem Datensatz', async () => {
    const { provider, urls } = withDataset(() => jsonResponse({ elements: OSM_AREA }));
    const s = await provider.getSummary('osm:way:202');
    expect(s.name).toBe('Café am Ufer');
    expect(urls).toEqual([DATASET]);
  });

  it('fällt auf Live-Abfragen zurück, wenn der Datensatz fehlt, und probiert ihn nicht sofort erneut', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { provider, urls } = withDataset(() => jsonResponse({}, 404));
    expect(names(await provider.search(QUERY))).toContain('Ramen Yokai');
    await provider.search({ ...QUERY, center: { latitude: 52.52, longitude: 13.4 } });
    expect(urls.filter((u) => u === DATASET)).toHaveLength(1);
    expect(urls.filter((u) => u.includes('overpass'))).toHaveLength(2);
    warn.mockRestore();
  });

  it('wertet einen leeren Datensatz als Fehler', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { provider, urls } = withDataset(() => jsonResponse({ elements: [] }));
    await provider.search(QUERY);
    expect(urls.some((u) => u.includes('overpass'))).toBe(true);
    warn.mockRestore();
  });
});

describe('Datensatz-Skript', () => {
  it('fragt dieselben Lokal-Arten ab wie die App', () => {
    const { OSM_AMENITIES } = jest.requireActual('@/services/places/osm-mapping');
    const script = readFileSync(join(__dirname, '../../../scripts/fetch-osm-berlin.mjs'), 'utf8');
    const listed = /export const AMENITIES = \[([\s\S]*?)\];/.exec(script)?.[1] ?? '';
    const scriptAmenities = [...listed.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(scriptAmenities).toEqual(OSM_AMENITIES);
  });
});
