import { PlacesError } from '@/services/places/errors';
import { GooglePlacesProvider } from '@/services/places/google-provider';
import type { GPlace } from '@/services/places/google-types';
import type { SearchQuery } from '@/services/places/provider';

import { FULL_PLACE } from '../fixtures/google-place';

const CENTER = { latitude: 52.5, longitude: 13.42 };
const BASE_QUERY: SearchQuery = { center: CENTER, radiusMeters: 1500 };

type Call = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function setup(responder: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchFn = jest.fn((url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return Promise.resolve(responder(call));
  }) as unknown as typeof fetch;
  const provider = new GooglePlacesProvider({ apiKey: 'test-key', fetchFn, timeoutMs: 50 });
  const body = (i = 0) => JSON.parse(String(calls[i]?.init.body)) as Record<string, unknown>;
  const header = (name: string, i = 0) =>
    (calls[i]?.init.headers as Record<string, string> | undefined)?.[name];
  return { provider, calls, body, header };
}

const place = (overrides: Partial<GPlace>): GPlace => ({ ...FULL_PLACE, ...overrides });

describe('GooglePlacesProvider.search', () => {
  it('nutzt Text Search bei Suchbegriff, mit Key und Feldmaske im Header', async () => {
    const { provider, calls, body, header } = setup(() =>
      jsonResponse({ places: [FULL_PLACE], nextPageToken: 'next-1' }),
    );
    const result = await provider.search({ ...BASE_QUERY, text: '  Ramen  ' });

    expect(calls[0]?.url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(calls[0]?.init.method).toBe('POST');
    expect(header('X-Goog-Api-Key')).toBe('test-key');
    expect(header('X-Goog-FieldMask')).toContain('places.rating');
    expect(header('X-Goog-FieldMask')).toContain('nextPageToken');
    expect(body()).toMatchObject({ textQuery: 'Ramen', languageCode: 'de', regionCode: 'DE' });
    expect(body().locationRestriction).toHaveProperty('rectangle');

    expect(result.places.map((p) => p.id)).toEqual(['ChIJabc']);
    expect(result.nextPageToken).toBe('next-1');
  });

  it('übergibt Filter an die API (Kategorie, Bewertung, Preis, geöffnet, Seite)', async () => {
    const { provider, body } = setup(() => jsonResponse({ places: [] }));
    await provider.search({
      ...BASE_QUERY,
      text: 'pasta',
      category: 'restaurant',
      minRating: 4.3,
      priceLevels: [1, 2],
      openNow: true,
      pageToken: 'tok',
    });
    expect(body()).toMatchObject({
      includedType: 'restaurant',
      strictTypeFiltering: true,
      minRating: 4,
      openNow: true,
      priceLevels: ['PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE'],
      pageToken: 'tok',
    });
  });

  it('fragt Merkmal-Felder nur an, wenn includeAttributes gesetzt ist', async () => {
    const { provider, header } = setup(() => jsonResponse({ places: [] }));
    await provider.search({ ...BASE_QUERY, text: 'x' });
    await provider.search({ ...BASE_QUERY, text: 'x', includeAttributes: true });
    expect(header('X-Goog-FieldMask', 0)).not.toContain('outdoorSeating');
    expect(header('X-Goog-FieldMask', 1)).toContain('places.outdoorSeating');
  });

  it('nutzt Nearby Search ohne Suchbegriff, mit Gastro-Typen und Kreis', async () => {
    const { provider, calls, body, header } = setup(() => jsonResponse({ places: [FULL_PLACE] }));
    const result = await provider.search({ ...BASE_QUERY, text: '   ' });

    expect(calls[0]?.url).toBe('https://places.googleapis.com/v1/places:searchNearby');
    expect(body().includedTypes).toEqual(expect.arrayContaining(['restaurant', 'cafe', 'bar']));
    expect(body().locationRestriction).toEqual({ circle: { center: CENTER, radius: 1500 } });
    expect(header('X-Goog-FieldMask')).not.toContain('nextPageToken');
    // Weitere „Seiten“ = Teilkreise (Google liefert pro Anfrage nur 20).
    expect(result.nextPageToken).toBe('1');
  });

  it('lädt bei Nearby weitere Seiten über Teilkreise: Mitte, dann 6 im Ring', async () => {
    const { provider, body } = setup(() => jsonResponse({ places: [FULL_PLACE] }));
    const center = await provider.search({ ...BASE_QUERY, pageToken: '1' });
    expect(body().locationRestriction).toEqual({ circle: { center: CENTER, radius: 825 } });
    expect(center.nextPageToken).toBe('2');
    const last = await provider.search({ ...BASE_QUERY, pageToken: '7' });
    expect((body().locationRestriction as { circle: { radius: number } }).circle.radius).toBe(825);
    expect(last.nextPageToken).toBeNull();
  });

  it('kleiner Umkreis: nur eine Anfrage, keine Teilkreise', async () => {
    const { provider } = setup(() => jsonResponse({ places: [FULL_PLACE] }));
    const result = await provider.search({ ...BASE_QUERY, radiusMeters: 500 });
    expect(result.nextPageToken).toBeNull();
  });

  it('findByName: günstige Namenssuche nahe einem Ort', async () => {
    const { provider, calls, body, header } = setup(() => jsonResponse({ places: [FULL_PLACE] }));
    const found = await provider.findByName('Nudelwerk', CENTER);
    expect(calls[0]?.url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(body().textQuery).toBe('Nudelwerk');
    expect(header('X-Goog-FieldMask')).toBe('places.id,places.displayName,places.location');
    expect(found[0]?.id).toBe('ChIJabc');
  });

  it('fragt bei Nearby keine ungültige Seite an', async () => {
    const { provider, calls } = setup(() => jsonResponse({ places: [FULL_PLACE] }));
    const result = await provider.search({ ...BASE_QUERY, pageToken: 'x' });
    expect(calls).toHaveLength(0);
    expect(result.places).toEqual([]);
  });

  it('filtert Nicht-Gastronomie, Orte außerhalb des Radius und unvollständige Einträge', async () => {
    const { provider } = setup(() =>
      jsonResponse({
        places: [
          FULL_PLACE,
          place({ id: 'hotel', primaryType: 'hotel', types: ['hotel', 'restaurant'] }),
          place({ id: 'far', location: { latitude: 52.6, longitude: 13.42 } }), // ~11 km
          { displayName: { text: 'ohne id' } },
        ],
      }),
    );
    const result = await provider.search({ ...BASE_QUERY, text: 'essen' });
    expect(result.places.map((p) => p.id)).toEqual(['ChIJabc']);
  });

  it('wendet Bedingungen auch clientseitig an (Nearby kennt sie nicht)', async () => {
    const { provider } = setup(() =>
      jsonResponse({
        places: [
          place({ id: 'good', rating: 4.5 }),
          place({ id: 'bad', rating: 3.1 }),
          place({ id: 'closed', currentOpeningHours: { openNow: false } }),
        ],
      }),
    );
    const result = await provider.search({ ...BASE_QUERY, minRating: 4, openNow: true });
    expect(result.places.map((p) => p.id)).toEqual(['good']);
  });
});

describe('GooglePlacesProvider.getDetails', () => {
  it('lädt Details per GET mit Detail-Feldmaske und Sprache', async () => {
    const { provider, calls, header } = setup(() => jsonResponse(FULL_PLACE));
    const details = await provider.getDetails('ChIJabc');
    expect(calls[0]?.url).toBe(
      'https://places.googleapis.com/v1/places/ChIJabc?languageCode=de&regionCode=DE',
    );
    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.init.body).toBeUndefined();
    expect(header('X-Goog-FieldMask')).toContain('reviews');
    expect(details.reviews).toHaveLength(1);
  });
});

describe('GooglePlacesProvider.getSummary', () => {
  it('lädt nur die Kartenfelder (keine Rezensionen, kein Kontakt)', async () => {
    const { provider, calls, header } = setup(() => jsonResponse(FULL_PLACE));
    const summary = await provider.getSummary('ChIJabc');
    expect(calls[0]?.url).toContain('/places/ChIJabc?');
    expect(header('X-Goog-FieldMask')).toContain('businessStatus');
    expect(header('X-Goog-FieldMask')).not.toContain('reviews');
    expect(header('X-Goog-FieldMask')).not.toContain('websiteUri');
    expect(summary).not.toHaveProperty('reviews');
    expect(summary.name).toBe('Testlokal');
  });
});

describe('Fehlerbehandlung', () => {
  const kindFor = async (responder: Parameters<typeof setup>[0]) => {
    const { provider } = setup(responder);
    try {
      await provider.getDetails('x');
    } catch (e) {
      expect(e).toBeInstanceOf(PlacesError);
      return (e as PlacesError).kind;
    }
    throw new Error('kein Fehler geworfen');
  };

  it.each([
    [429, undefined, 'quota'],
    [403, 'RESOURCE_EXHAUSTED', 'quota'],
    [403, 'PERMISSION_DENIED', 'auth'],
    [400, 'INVALID_ARGUMENT', 'invalid_request'],
    [404, 'NOT_FOUND', 'not_found'],
    [503, undefined, 'server'],
  ] as const)('HTTP %i / %s → %s', async (status, apiStatus, kind) => {
    expect(
      await kindFor(() =>
        jsonResponse({ error: { code: status, status: apiStatus, message: 'x' } }, status),
      ),
    ).toBe(kind);
  });

  it('meldet Netzwerkfehler', async () => {
    expect(await kindFor(() => Promise.reject(new TypeError('Network request failed')))).toBe(
      'network',
    );
  });

  it('meldet Zeitüberschreitung', async () => {
    const { provider } = setup(
      (call) =>
        new Promise<Response>((_, reject) => {
          call.init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(provider.getDetails('x')).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('meldet unlesbare Antworten als Serverfehler', async () => {
    expect(
      await kindFor(
        () => ({ ok: true, status: 200, json: () => Promise.reject(new Error()) }) as Response,
      ),
    ).toBe('server');
  });
});

describe('getPhotoUrl', () => {
  it('baut die Media-URL mit begrenzter Breite', () => {
    const { provider } = setup(() => jsonResponse({}));
    const url = provider.getPhotoUrl(
      { name: 'places/a/photos/b', widthPx: null, heightPx: null, attributions: [] },
      9999,
    );
    expect(url).toBe(
      'https://places.googleapis.com/v1/places/a/photos/b/media?maxWidthPx=4800&key=test-key',
    );
  });
});
