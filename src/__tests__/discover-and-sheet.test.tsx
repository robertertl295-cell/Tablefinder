import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MapSheet } from '@/components/place/map-sheet';
import { MOCK_PLACES } from '@/services/places/mock-data';
import type { Favorite } from '@/types/favorites';
import { EMPTY_ATTRIBUTES, type PlaceSummary } from '@/types/place';
import { discoverRows } from '@/utils/discover';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

const p = (i: number, patch: Partial<PlaceSummary> = {}): PlaceSummary => ({
  ...MOCK_PLACES[0]!,
  id: `osm:node/${i}`,
  name: `Lokal ${i}`,
  source: 'osm',
  location: { latitude: 52.5 + i * 0.001, longitude: 13.4 },
  rating: null,
  ratingCount: 0,
  openNow: null,
  priceLevel: null,
  attributes: { ...EMPTY_ATTRIBUTES },
  ...patch,
});

describe('discoverRows', () => {
  it('baut Reihen aus den Treffern, nur ab drei Lokalen, höchstens zehn', () => {
    const places = [
      ...Array.from({ length: 12 }, (_, i) => p(i, { openNow: true })),
      p(20, { attributes: { ...EMPTY_ATTRIBUTES, outdoorSeating: true } }),
    ];
    const rows = discoverRows(places, {}, { latitude: 52.5, longitude: 13.4 });
    expect(rows.map((r) => r.id)).toEqual(['open']);
    expect(rows[0]!.places).toHaveLength(10);
    expect(rows[0]!.places[0]!.id).toBe('osm:node/0'); // nächstes zuerst
  });

  it('„Top bewertet“ nach Vertrauensscore, nur mit genug Bewertungen', () => {
    const places = [
      p(1, { rating: 4.9, ratingCount: 5 }), // zu wenige Bewertungen
      p(2, { rating: 4.5, ratingCount: 800 }),
      p(3, { rating: 4.8, ratingCount: 30 }),
      p(4, { rating: 4.2, ratingCount: 2000 }),
    ];
    const top = discoverRows(places, {}, null).find((r) => r.id === 'top')!;
    expect(top.title).toBe('Top bewertet');
    // 4,8 aus 30 → 4,57; 4,5 aus 800 → 4,49; 4,2 aus 2000 → 4,20
    expect(top.places.map((x) => x.id)).toEqual(['osm:node/3', 'osm:node/2', 'osm:node/4']);
  });

  it('„Gemerkt, noch nicht besucht“ aus den Favoriten', () => {
    const fav = (visited: boolean) => ({ visited }) as Favorite;
    const places = [p(1), p(2), p(3), p(4)];
    const favorites = {
      'osm:node/1': fav(false),
      'osm:node/2': fav(false),
      'osm:node/3': fav(false),
      'osm:node/4': fav(true),
    };
    const row = discoverRows(places, favorites, null).find((r) => r.id === 'untried')!;
    expect(row.places.map((x) => x.id)).toEqual(['osm:node/1', 'osm:node/2', 'osm:node/3']);
  });
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('MapSheet', () => {
  const google: PlaceSummary = {
    ...p(9),
    id: 'ChIJgoogle',
    name: 'Google-Lokal',
    source: 'google',
  };
  const renderSheet = (places: PlaceSummary[]) =>
    render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <MapSheet
          places={places}
          userLocation={null}
          selectedId={null}
          onSelect={jest.fn()}
          summary={`${places.length} Treffer`}
        />
      </SafeAreaProvider>,
    );

  it('eingeklappt: nur Lokale, die mit der Karte gezeigt werden dürfen (EWR)', async () => {
    await renderSheet([p(1), google]);
    expect(screen.getByText('Lokal 1')).toBeOnTheScreen();
    expect(screen.queryByText('Google-Lokal')).toBeNull();
    expect(screen.getByText(/1 Google-Lokale nur als Punkt/)).toBeOnTheScreen();
  });

  it('hochgezogen: alle Lokale, die Karte ist verdeckt', async () => {
    await renderSheet([p(1), google]);
    await act(async () => fireEvent.press(screen.getByLabelText('Liste aufklappen')));
    expect(screen.getByText('Google-Lokal')).toBeOnTheScreen();
    expect(screen.getByText('Lokal 1')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByLabelText('Karte zeigen')));
    expect(screen.queryByText('Google-Lokal')).toBeNull();
  });
});
