/**
 * Smoke-Test für den Such-Flow: Start ohne Standortfreigabe → Treffer in Mitte →
 * Suchbegriff ohne Treffer → Bezirk wechseln → Treffer antippen öffnet die Details.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SearchScreen from '@/app/(tabs)/index';
import { useAutoSearch } from '@/hooks/use-auto-search';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

jest.mock('@/services/location', () => ({
  requestCurrentLocation: jest.fn(async () => ({ status: 'denied' })),
}));

jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  const { CachedPlacesProvider } = jest.requireActual('@/services/places/cached-provider');
  return {
    ...actual,
    placesProvider: new CachedPlacesProvider(new MockPlacesProvider({ latencyMs: 0 })),
  };
});

function App() {
  useAutoSearch();
  return <SearchScreen />;
}

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const WAIT = { timeout: 3000 };

it('führt durch den Such-Flow', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <App />
    </SafeAreaProvider>,
  );

  // Ohne Standortfreigabe: Hinweis und Treffer rund um Berlin-Mitte.
  expect(await screen.findByText(/Standort nicht freigegeben/, {}, WAIT)).toBeOnTheScreen();
  expect(await screen.findByText('Café Morgenlicht', {}, WAIT)).toBeOnTheScreen();
  expect(screen.getByText(/Treffer · Berlin-Mitte/)).toBeOnTheScreen();
  expect(screen.queryByText('Hotel Am Alex')).toBeNull(); // kein Gastronomiebetrieb

  // Suchbegriff, den es in Mitte nicht gibt → Leerzustand.
  await fireEvent.changeText(
    screen.getByLabelText('Suche nach Restaurants, Cafés und Bars'),
    'ramen',
  );
  expect(await screen.findByText('Keine Treffer für „ramen“', {}, WAIT)).toBeOnTheScreen();

  // Bezirk wechseln → Treffer.
  await fireEvent.press(screen.getByLabelText('Kreuzberg'));
  expect(await screen.findByText('Nudelwerk Ramen', {}, WAIT)).toBeOnTheScreen();
  expect(screen.getByText(/1 Treffer · Kreuzberg/)).toBeOnTheScreen();

  // Antippen öffnet die Detailseite.
  await fireEvent.press(screen.getByText('Nudelwerk Ramen'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/place/[id]',
    params: { id: 'mock-ramen-kreuzberg' },
  });
});
