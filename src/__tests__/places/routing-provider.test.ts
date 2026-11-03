import { MockPlacesProvider } from '@/services/places/mock-provider';
import type { PlacesProvider } from '@/services/places/provider';
import { RoutingPlacesProvider, sourceOfId } from '@/services/places/routing-provider';
import type { DataSource } from '@/types/place';

function fake(source: DataSource): PlacesProvider & { clear: jest.Mock } {
  return {
    source,
    search: jest.fn(async () => ({ places: [], nextPageToken: null })),
    getDetails: jest.fn(async (id: string) => ({ id, source }) as never),
    getSummary: jest.fn(async (id: string) => ({ id, source }) as never),
    getPhotoUrl: jest.fn(() => `${source}-url`),
    clear: jest.fn(),
  };
}

describe('sourceOfId', () => {
  it('erkennt die Quelle an der ID', () => {
    expect(sourceOfId('osm:node:1')).toBe('osm');
    expect(sourceOfId('mock-cafe-mitte')).toBe('mock');
    expect(sourceOfId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe('google');
  });
});

describe('RoutingPlacesProvider', () => {
  it('sucht in der aktiven Quelle und folgt Wechseln', async () => {
    const google = fake('google');
    const osm = fake('osm');
    let active: DataSource = 'google';
    const router = new RoutingPlacesProvider({ google, osm }, () => active);
    const q = { center: { latitude: 0, longitude: 0 }, radiusMeters: 1 };
    await router.search(q);
    active = 'osm';
    await router.search(q);
    expect(google.search).toHaveBeenCalledTimes(1);
    expect(osm.search).toHaveBeenCalledTimes(1);
    expect(router.source).toBe('osm');
  });

  it('lädt Details aus der Quelle der ID – unabhängig von der aktiven Quelle', async () => {
    const google = fake('google');
    const osm = fake('osm');
    const router = new RoutingPlacesProvider({ google, osm }, () => 'osm');
    await router.getDetails('ChIJabc');
    await router.getSummary('osm:way:2');
    expect(google.getDetails).toHaveBeenCalledWith('ChIJabc');
    expect(osm.getSummary).toHaveBeenCalledWith('osm:way:2');
  });

  it('meldet Google-Favoriten ohne Schlüssel als auth-Fehler', async () => {
    const router = new RoutingPlacesProvider({ osm: fake('osm') }, () => 'osm');
    await expect(router.getSummary('ChIJabc')).rejects.toMatchObject({ kind: 'auth' });
  });

  it('leitet Fotos weiter und leert alle Speicher', () => {
    const google = fake('google');
    const mock = fake('mock');
    const router = new RoutingPlacesProvider({ google, mock }, () => 'google');
    const photo = (name: string) => ({ name, widthPx: null, heightPx: null, attributions: [] });
    expect(router.getPhotoUrl(photo('places/x/photos/y'), 100)).toBe('google-url');
    expect(router.getPhotoUrl(photo('mock/a/0'), 100)).toBe('mock-url');
    router.clear();
    expect(google.clear).toHaveBeenCalled();
    expect(mock.clear).toHaveBeenCalled();
  });

  it('funktioniert mit echten Anbietern (Beispieldaten)', async () => {
    const router = new RoutingPlacesProvider(
      { mock: new MockPlacesProvider({ latencyMs: 0 }) },
      () => 'mock',
    );
    expect((await router.getDetails('mock-cafe-mitte')).name).toBe('Café Morgenlicht');
  });
});
