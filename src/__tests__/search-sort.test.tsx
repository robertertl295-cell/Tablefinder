/** Sortierung der Suchtreffer: Auswahl im Filter-Sheet, Anzeige und Reihenfolge in der Liste. */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SearchScreen from '@/app/(tabs)/index';
import FiltersSheet from '@/app/filters';
import { useAutoSearch } from '@/hooks/use-auto-search';
import { searchStore } from '@/store/search-store';
import { settingsStore } from '@/store/settings-store';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/services/location', () => ({
  requestCurrentLocation: jest.fn(async () => ({ status: 'denied' })),
}));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  return { ...actual, placesProvider: new MockPlacesProvider({ latencyMs: 0 }) };
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const WAIT = { timeout: 3000 };

function App() {
  useAutoSearch();
  return <SearchScreen />;
}

/** Namen der Treffer in Anzeigereihenfolge. */
const shownNames = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string | undefined)
    .filter((l): l is string => !!l && l.includes('Sternen'))
    .map((l) => l.split(',')[0]);

it('sortiert nach Vertrauensscore und zeigt ihn auf den Karten', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <App />
    </SafeAreaProvider>,
  );
  await act(async () => searchStore.getState().selectDistrict('kreuzberg'));
  expect(await screen.findByText('Nudelwerk Ramen', {}, WAIT)).toBeOnTheScreen();
  await waitFor(() => expect(shownNames()).toContain('Kebab am Kanal'), WAIT);
  // Relevanz = Reihenfolge der Datenquelle; kein Score auf den Karten.
  expect(screen.queryByText(/^Vertrauensscore/)).toBeNull();

  await act(async () => settingsStore.getState().setResultSort('trust'));
  expect(screen.getByText('Nach Vertrauensscore')).toBeOnTheScreen();
  // Die Liste rendert virtualisiert nur die ersten Karten – deren Reihenfolge zählt.
  expect(shownNames().slice(0, 3)).toEqual([
    'Nudelwerk Ramen', // 4,6 aus 1.284 → 4,594
    'Grünzeug Küche', // 4,8 aus 22 → 4,534
    'Sonnendeck Café', // 4,6 aus 87 → 4,533
  ]);
  expect(
    within(screen.getByLabelText(/^Nudelwerk Ramen,/)).getByText(/Vertrauensscore/),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText(/^Nudelwerk Ramen,.*Vertrauensscore 4,6$/)).toBeOnTheScreen();

  // Chip antippen → zurück zu Relevanz, Score verschwindet von den Karten.
  await fireEvent.press(
    screen.getByLabelText('Sortierung Nach Vertrauensscore. Zurück zu Relevanz'),
  );
  expect(settingsStore.getState().resultSort).toBe('relevance');
  expect(screen.queryByText(/^Vertrauensscore/)).toBeNull();
});

it('wählt die Sortierung im Filter-Sheet sofort', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <FiltersSheet />
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByLabelText('Vertrauensscore'));
  expect(settingsStore.getState().resultSort).toBe('trust');
  await fireEvent.press(screen.getByLabelText('Relevanz'));
  expect(settingsStore.getState().resultSort).toBe('relevance');
});
