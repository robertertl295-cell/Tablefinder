import { TtlCache } from '@/services/places/cache';
import { CachedPlacesProvider, searchCacheKey } from '@/services/places/cached-provider';
import { PlacesError } from '@/services/places/errors';
import type { PlacesProvider, SearchQuery } from '@/services/places/provider';
import type { PlaceDetails, PlaceSummary } from '@/types/place';

const QUERY: SearchQuery = {
  text: 'ramen',
  center: { latitude: 52.5, longitude: 13.4 },
  radiusMeters: 1000,
};

function fakeProvider() {
  const inner = {
    source: 'mock' as const,
    search: jest.fn(async () => ({ places: [], nextPageToken: null })),
    getDetails: jest.fn(async (id: string) => ({ id }) as PlaceDetails),
    getSummary: jest.fn(async (id: string) => ({ id, name: 'kurz' }) as PlaceSummary),
    getPhotoUrl: jest.fn(() => 'url'),
  } satisfies PlacesProvider;
  let time = 0;
  const clock = { now: () => time, advance: (ms: number) => (time += ms) };
  const cached = new CachedPlacesProvider(inner, {
    searchTtlMs: 1000,
    detailsTtlMs: 5000,
    now: clock.now,
  });
  return { inner, cached, clock };
}

describe('TtlCache', () => {
  it('vergisst Einträge nach Ablauf', () => {
    let t = 0;
    const cache = new TtlCache<string>(100, 10, () => t);
    cache.set('a', '1');
    t = 99;
    expect(cache.get('a')).toBe('1');
    t = 100;
    expect(cache.get('a')).toBeUndefined();
  });

  it('verdrängt den am längsten ungenutzten Eintrag', () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // a ist jetzt jünger als b
    cache.set('c', 3);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);
  });
});

describe('searchCacheKey', () => {
  it('ignoriert Schreibweise, Leerzeichen, Reihenfolge der Preise und GPS-Rauschen', () => {
    const a = searchCacheKey({ ...QUERY, text: ' Ramen ', priceLevels: [2, 1] });
    const b = searchCacheKey({
      ...QUERY,
      priceLevels: [1, 2],
      center: { latitude: 52.500001, longitude: 13.400002 },
    });
    expect(a).toBe(b);
  });

  it('unterscheidet verschiedene Seiten', () => {
    expect(searchCacheKey(QUERY)).not.toBe(searchCacheKey({ ...QUERY, pageToken: '2' }));
  });
});

describe('CachedPlacesProvider', () => {
  it('beantwortet Wiederholungen aus dem Cache, bis die Zeit abläuft', async () => {
    const { inner, cached, clock } = fakeProvider();
    await cached.search(QUERY);
    await cached.search(QUERY);
    expect(inner.search).toHaveBeenCalledTimes(1);
    clock.advance(1000);
    await cached.search(QUERY);
    expect(inner.search).toHaveBeenCalledTimes(2);
  });

  it('bündelt gleichzeitige identische Anfragen', async () => {
    const { inner, cached } = fakeProvider();
    await Promise.all([cached.getDetails('a'), cached.getDetails('a'), cached.getDetails('b')]);
    expect(inner.getDetails).toHaveBeenCalledTimes(2);
  });

  it('speichert Fehler nicht', async () => {
    const { inner, cached } = fakeProvider();
    inner.getDetails.mockRejectedValueOnce(new PlacesError('network', 'offline'));
    await expect(cached.getDetails('a')).rejects.toMatchObject({ kind: 'network' });
    await expect(cached.getDetails('a')).resolves.toEqual({ id: 'a' });
    expect(inner.getDetails).toHaveBeenCalledTimes(2);
  });

  it('leert den Cache auf Wunsch und reicht Quelle und Foto-URL durch', async () => {
    const { inner, cached } = fakeProvider();
    await cached.getDetails('a');
    cached.clear();
    await cached.getDetails('a');
    expect(inner.getDetails).toHaveBeenCalledTimes(2);
    expect(cached.source).toBe('mock');
    expect(
      cached.getPhotoUrl({ name: 'p', widthPx: null, heightPx: null, attributions: [] }, 100),
    ).toBe('url');
  });
});

describe('CachedPlacesProvider.getSummary', () => {
  it('cacht Kurzdaten und bündelt parallele Anfragen', async () => {
    const { inner, cached } = fakeProvider();
    await Promise.all([cached.getSummary('a'), cached.getSummary('a')]);
    await cached.getSummary('a');
    expect(inner.getSummary).toHaveBeenCalledTimes(1);
  });

  it('nutzt frisch geladene Details statt einer zweiten Anfrage', async () => {
    const { inner, cached } = fakeProvider();
    await cached.getDetails('a');
    await expect(cached.getSummary('a')).resolves.toEqual({ id: 'a' });
    expect(inner.getSummary).not.toHaveBeenCalled();
  });
});
