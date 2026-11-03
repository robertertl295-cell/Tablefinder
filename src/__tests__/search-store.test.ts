import { DEFAULT_LOCATION } from '@/services/config';
import type { LocationResult } from '@/services/location';
import { PlacesError } from '@/services/places/errors';
import { MockPlacesProvider } from '@/services/places/mock-provider';
import type { PlacesProvider, SearchQuery, SearchResult } from '@/services/places/provider';
import { createSearchStore, locationLabel, searchCenter } from '@/store/search-store';

const KREUZBERG_USER = { latitude: 52.4995, longitude: 13.42 };

function setup(
  options: { location?: LocationResult; provider?: PlacesProvider & { clear?: () => void } } = {},
) {
  const provider = options.provider ?? new MockPlacesProvider({ latencyMs: 0, pageSize: 3 });
  const searchSpy = jest.spyOn(provider, 'search');
  const store = createSearchStore({
    provider,
    locate: async () => options.location ?? { status: 'denied' },
    radiusMeters: 1500,
  });
  const lastQuery = (): SearchQuery | undefined => searchSpy.mock.calls.at(-1)?.[0];
  return { store, provider, searchSpy, lastQuery };
}

/** Provider, dessen Antworten der Test selbst auslöst. */
function controllableProvider() {
  const pending: { resolve: (r: SearchResult) => void; reject: (e: unknown) => void }[] = [];
  const provider: PlacesProvider = {
    source: 'mock',
    search: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    getDetails: () => Promise.reject(new Error('nicht benötigt')),
    getPhotoUrl: () => null,
  };
  return { provider, pending };
}

describe('Standort', () => {
  it('nutzt den eigenen Standort, wenn freigegeben', async () => {
    const { store, lastQuery } = setup({ location: { status: 'granted', coords: KREUZBERG_USER } });
    await store.getState().locate();
    expect(store.getState().locationStatus).toBe('granted');
    await store.getState().search();
    expect(lastQuery()?.center).toEqual(KREUZBERG_USER);
    expect(locationLabel(store.getState())).toBe('In deiner Nähe');
  });

  it('fällt ohne Freigabe auf Berlin-Mitte zurück', async () => {
    const { store, lastQuery } = setup({ location: { status: 'denied' } });
    await store.getState().locate();
    await store.getState().search();
    expect(store.getState().locationStatus).toBe('denied');
    expect(lastQuery()?.center).toEqual(DEFAULT_LOCATION);
    expect(locationLabel(store.getState())).toBe('Berlin-Mitte');
  });

  it('sucht im gewählten Bezirk und im Kartenausschnitt', async () => {
    const { store, lastQuery } = setup({ location: { status: 'granted', coords: KREUZBERG_USER } });
    store.getState().selectDistrict('charlottenburg');
    expect(locationLabel(store.getState())).toBe('Charlottenburg');
    await store.getState().search();
    expect(lastQuery()?.center.longitude).toBeCloseTo(13.31, 1);

    store.getState().selectArea({ latitude: 52.4, longitude: 13.3 }, 4000);
    await store.getState().search();
    expect(lastQuery()).toMatchObject({
      center: { latitude: 52.4, longitude: 13.3 },
      radiusMeters: 4000,
    });
    expect(locationLabel(store.getState())).toBe('Kartenausschnitt');
  });

  it('fragt beim Zurückwechseln erneut nach dem Standort, falls er fehlt', async () => {
    const locate = jest.fn(async (): Promise<LocationResult> => ({ status: 'denied' }));
    const store = createSearchStore({ provider: new MockPlacesProvider({ latencyMs: 0 }), locate });
    store.getState().selectDistrict('mitte');
    store.getState().selectCurrentLocation();
    expect(locate).toHaveBeenCalledTimes(1);
    expect(searchCenter(store.getState())).toEqual(DEFAULT_LOCATION);
  });
});

describe('Suche', () => {
  it('übergibt getrimmten Text und liefert Treffer', async () => {
    const { store, lastQuery } = setup();
    store.getState().selectDistrict('kreuzberg');
    store.getState().setText('  ramen ');
    await store.getState().search();
    expect(lastQuery()?.text).toBe('ramen');
    expect(store.getState().status).toBe('success');
    expect(store.getState().results.map((p) => p.id)).toEqual(['mock-ramen-kreuzberg']);
  });

  it('schickt leeren Text als undefined (Umgebungssuche)', async () => {
    const { store, lastQuery } = setup();
    store.getState().setText('   ');
    await store.getState().search();
    expect(lastQuery()?.text).toBeUndefined();
  });

  it('ignoriert verspätete Antworten älterer Suchen', async () => {
    const { provider, pending } = controllableProvider();
    const { store } = setup({ provider });
    const first = store.getState().search();
    const second = store.getState().search();
    pending[1]?.resolve({ places: [], nextPageToken: 'neu' });
    await second;
    pending[0]?.resolve({ places: [], nextPageToken: 'alt' });
    await first;
    expect(store.getState().nextPageToken).toBe('neu');
  });

  it('zeigt Fehler als PlacesError und leert die Treffer', async () => {
    const { provider, pending } = controllableProvider();
    const { store } = setup({ provider });
    const run = store.getState().search();
    pending[0]?.reject(new PlacesError('quota', 'limit'));
    await run;
    expect(store.getState().status).toBe('error');
    expect(store.getState().error?.kind).toBe('quota');
    expect(store.getState().results).toEqual([]);
  });
});

describe('Nachladen und Aktualisieren', () => {
  it('lädt weitere Seiten ohne Doppelte, bis keine mehr da sind', async () => {
    const { store } = setup();
    store.getState().selectArea({ latitude: 52.515, longitude: 13.4 }, 20_000);
    await store.getState().search();
    expect(store.getState().results).toHaveLength(3);
    while (store.getState().nextPageToken) await store.getState().loadMore();
    const ids = store.getState().results.map((p) => p.id);
    expect(ids.length).toBeGreaterThan(3);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lädt nicht nach, solange eine Suche läuft oder kein Token da ist', async () => {
    const { store, searchSpy } = setup();
    await store.getState().loadMore();
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('behält Treffer, wenn das Nachladen fehlschlägt', async () => {
    const { provider, pending } = controllableProvider();
    const { store } = setup({ provider });
    const run = store.getState().search();
    pending[0]?.resolve({ places: [], nextPageToken: 'p2' });
    await run;
    const more = store.getState().loadMore();
    expect(store.getState().isLoadingMore).toBe(true);
    pending[1]?.reject(new PlacesError('network', 'offline'));
    await more;
    expect(store.getState().isLoadingMore).toBe(false);
    expect(store.getState().status).toBe('success');
    expect(store.getState().nextPageToken).toBe('p2');
  });

  it('leert beim Aktualisieren den Cache', async () => {
    const provider = Object.assign(new MockPlacesProvider({ latencyMs: 0 }), { clear: jest.fn() });
    const { store } = setup({ provider });
    await store.getState().refresh();
    expect(provider.clear).toHaveBeenCalled();
    expect(store.getState().isRefreshing).toBe(false);
    expect(store.getState().status).toBe('success');
  });
});
