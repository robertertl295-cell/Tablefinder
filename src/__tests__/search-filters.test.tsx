/** Oberflächentest: aktive Filter erscheinen als Chips, wirken auf die Treffer und lassen sich entfernen. */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SearchScreen from '@/app/(tabs)/index';
import { useAutoSearch } from '@/hooks/use-auto-search';
import { filterStore } from '@/store/filter-store';
import { createDefaultFilters } from '@/utils/filters';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/services/location', () => ({
  requestCurrentLocation: jest.fn(async () => ({ status: 'denied' })),
}));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  return { ...actual, placesProvider: new MockPlacesProvider({ latencyMs: 0 }) };
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

it('wendet Filter an, zeigt sie als Chips und entfernt sie wieder', async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <App />
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Mittagstisch Spree', {}, WAIT)).toBeOnTheScreen();
  expect(screen.getByText('Café Morgenlicht')).toBeOnTheScreen();

  // Filter setzen (wie nach dem Schließen des Filter-Sheets).
  await act(async () => {
    filterStore.getState().setFilters({ ...createDefaultFilters(), categories: ['cafe'] });
  });
  expect(screen.getByLabelText('Filter, 1 aktiv')).toBeOnTheScreen();
  expect(screen.getByLabelText('Filter Café entfernen')).toBeOnTheScreen();
  await waitFor(() => expect(screen.queryByText('Mittagstisch Spree')).toBeNull(), WAIT);
  expect(screen.getByText('Café Morgenlicht')).toBeOnTheScreen();

  // Filter-Button öffnet das Sheet.
  await fireEvent.press(screen.getByLabelText('Filter, 1 aktiv'));
  expect(mockPush).toHaveBeenCalledWith('/filters');

  // Chip antippen entfernt den Filter.
  await fireEvent.press(screen.getByLabelText('Filter Café entfernen'));
  expect(await screen.findByText('Mittagstisch Spree', {}, WAIT)).toBeOnTheScreen();
  expect(screen.getByLabelText('Filter')).toBeOnTheScreen();

  // Leerzustand bietet „Filter zurücksetzen“ an.
  await act(async () => {
    filterStore.getState().setFilters({ ...createDefaultFilters(), categories: ['bakery'] });
  });
  expect(await screen.findByText('Filter zurücksetzen', {}, WAIT)).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Filter zurücksetzen'));
  expect(filterStore.getState().filters).toEqual(createDefaultFilters());
  expect(await screen.findByText('Mittagstisch Spree', {}, WAIT)).toBeOnTheScreen();
});
