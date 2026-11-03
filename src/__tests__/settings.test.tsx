import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createJSONStorage } from 'zustand/middleware';

import SettingsScreen from '@/app/(tabs)/settings';
import { PlaceCard } from '@/components/place/place-card';
import { MOCK_PLACES } from '@/services/places/mock-data';
import { favoritesStore } from '@/store/favorites-store';
import { filterStore } from '@/store/filter-store';
import {
  createSettingsStore,
  DEFAULT_SETTINGS,
  sanitizeSettings,
  settingsStore,
  SETTINGS_STORAGE_KEY,
} from '@/store/settings-store';
import { createDefaultFilters } from '@/utils/filters';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  const { CachedPlacesProvider } = jest.requireActual('@/services/places/cached-provider');
  return {
    ...actual,
    placesProvider: new CachedPlacesProvider(new MockPlacesProvider({ latencyMs: 0 })),
  };
});
const mockDeleteFiles = jest.fn();
jest.mock('@/services/favorites-file', () => ({ deleteBackupFiles: () => mockDeleteFiles() }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>
);

beforeEach(async () => {
  jest.restoreAllMocks();
  await act(async () => {
    settingsStore.getState().reset();
    filterStore.getState().reset();
    favoritesStore.getState().clearAll();
  });
});

describe('Einstellungen-Store', () => {
  it('bereinigt ungültige Werte', () => {
    expect(
      sanitizeSettings({
        defaultRadiusMeters: 123,
        units: 'lichtjahre',
        resultSort: 'zufall',
        dataSource: 'bing',
      }),
    ).toEqual(DEFAULT_SETTINGS);
    expect(
      sanitizeSettings({ defaultRadiusMeters: 3000, units: 'imperial', resultSort: 'trust' }),
    ).toEqual({
      defaultRadiusMeters: 3000,
      units: 'imperial',
      resultSort: 'trust',
      dataSource: 'auto',
    });
    // Ältere gespeicherte Stände ohne Sortierung bekommen den Standard.
    expect(sanitizeSettings({ defaultRadiusMeters: 3000 }).resultSort).toBe('relevance');
  });

  it('speichert und lädt Einstellungen', async () => {
    const data = new Map<string, string>();
    const storage = createJSONStorage(() => ({
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => void data.set(k, v),
      removeItem: async (k: string) => void data.delete(k),
    })) as never;
    const first = createSettingsStore(storage);
    await new Promise((r) => setTimeout(r, 0));
    first.getState().setUnits('imperial');
    first.getState().setDefaultRadius(5000);
    first.getState().setResultSort('trust');
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse(data.get(SETTINGS_STORAGE_KEY)!).state).toEqual({
      defaultRadiusMeters: 5000,
      units: 'imperial',
      resultSort: 'trust',
      dataSource: 'auto',
    });

    const second = createSettingsStore(storage);
    for (let i = 0; i < 10 && !second.getState().hydrated; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(second.getState()).toMatchObject({
      defaultRadiusMeters: 5000,
      units: 'imperial',
      resultSort: 'trust',
    });
  });
});

describe('Einstellungen-Screen', () => {
  it('ändert den Standard-Umkreis und übernimmt ihn in unveränderte Filter', async () => {
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(screen.getByLabelText('3,0 km'));
    expect(settingsStore.getState().defaultRadiusMeters).toBe(3000);
    expect(filterStore.getState().filters.radiusMeters).toBe(3000);

    // Selbst gewählter Umkreis bleibt unangetastet.
    await act(async () =>
      filterStore.getState().setFilters({ ...createDefaultFilters(), radiusMeters: 500 }),
    );
    await fireEvent.press(screen.getByLabelText('5,0 km'));
    expect(filterStore.getState().filters.radiusMeters).toBe(500);

    // Zurücksetzen der Filter nutzt den neuen Standard.
    await act(async () => filterStore.getState().reset());
    expect(filterStore.getState().filters.radiusMeters).toBe(5000);
  });

  it('stellt Einheiten um – sichtbar auch auf Ergebniskarten', async () => {
    const place = MOCK_PLACES.find((p) => p.id === 'mock-cafe-mitte')!;
    await render(
      wrap(
        <>
          <SettingsScreen />
          <PlaceCard place={place} distanceMeters={1609} onPress={jest.fn()} />
        </>,
      ),
    );
    expect(screen.getByText('Café · € · 1,6 km')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Meilen'));
    expect(settingsStore.getState().units).toBe('imperial');
    expect(screen.getByLabelText('0,6 mi')).toBeOnTheScreen(); // Radius-Chip 1 km
    expect(screen.getByText('Café · € · 1,0 mi')).toBeOnTheScreen();
  });

  it('löscht nach Bestätigung alle lokalen Daten', async () => {
    favoritesStore.getState().createList('Date');
    favoritesStore.getState().addFavorite('p1');
    settingsStore.getState().setUnits('imperial');
    filterStore.getState().setFilters({ ...createDefaultFilters(), openNow: true });

    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons?: AlertButton[]) =>
        buttons?.find((b) => b.text === 'Alles löschen')?.onPress?.(),
      );
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(screen.getByText('Alle lokalen Daten löschen'));

    expect(alert).toHaveBeenCalledWith('Gelöscht', 'Alle lokalen Daten wurden entfernt.');
    expect(favoritesStore.getState().favorites).toEqual({});
    expect(favoritesStore.getState().lists).toEqual([]);
    expect(settingsStore.getState().units).toBe('metric');
    expect(filterStore.getState().filters).toEqual(createDefaultFilters());
    expect(mockDeleteFiles).toHaveBeenCalled();
  });

  it('löscht nichts beim Abbrechen', async () => {
    favoritesStore.getState().addFavorite('p1');
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons?: AlertButton[]) =>
        buttons?.find((b) => b.text === 'Abbrechen')?.onPress?.(),
      );
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(screen.getByText('Alle lokalen Daten löschen'));
    expect(favoritesStore.getState().favorites.p1).toBeDefined();
  });
});
