import { useStore } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { DEFAULT_RADIUS_METERS } from '@/services/config';
import { persistStorage } from '@/services/storage';
import { RADIUS_OPTIONS } from '@/utils/filters';
import type { Units } from '@/utils/format';
import { RESULT_SORT_OPTIONS, type ResultSort } from '@/utils/sort-places';

export const RADIUS_SETTING_OPTIONS = RADIUS_OPTIONS;

/** Gewünschte Datenquelle; „auto“ = Google mit API-Schlüssel, sonst OpenStreetMap. */
export type SourcePreference = 'auto' | 'google' | 'osm' | 'mock';
export const SOURCE_PREFERENCES: readonly SourcePreference[] = ['auto', 'google', 'osm', 'mock'];

export type Settings = {
  defaultRadiusMeters: number;
  units: Units;
  /** Sortierung der Suchtreffer. */
  resultSort: ResultSort;
  dataSource: SourcePreference;
};

export type SettingsState = Settings & {
  hydrated: boolean;
  setDefaultRadius: (meters: number) => void;
  setUnits: (units: Units) => void;
  setResultSort: (sort: ResultSort) => void;
  setDataSource: (source: SourcePreference) => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultRadiusMeters: DEFAULT_RADIUS_METERS,
  units: 'metric',
  resultSort: 'relevance',
  dataSource: 'auto',
};

export const SETTINGS_STORAGE_KEY = 'tablefinder.settings';

export function sanitizeSettings(input: unknown): Settings {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  return {
    defaultRadiusMeters: (RADIUS_SETTING_OPTIONS as readonly unknown[]).includes(
      raw.defaultRadiusMeters,
    )
      ? (raw.defaultRadiusMeters as number)
      : DEFAULT_SETTINGS.defaultRadiusMeters,
    units: raw.units === 'imperial' ? 'imperial' : 'metric',
    resultSort: RESULT_SORT_OPTIONS.includes(raw.resultSort as ResultSort)
      ? (raw.resultSort as ResultSort)
      : DEFAULT_SETTINGS.resultSort,
    dataSource: SOURCE_PREFERENCES.includes(raw.dataSource as SourcePreference)
      ? (raw.dataSource as SourcePreference)
      : DEFAULT_SETTINGS.dataSource,
  };
}

export function createSettingsStore(
  storage: PersistStorage<Settings> | undefined = persistStorage as PersistStorage<Settings>,
): StoreApi<SettingsState> {
  let store: StoreApi<SettingsState> | undefined;
  let finishedEarly = false;
  const markHydrated = () => {
    if (store) store.setState({ hydrated: true });
    else finishedEarly = true;
  };

  store = createStore<SettingsState>()(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,
        hydrated: false,
        setDefaultRadius: (meters) =>
          set({
            defaultRadiusMeters: sanitizeSettings({ defaultRadiusMeters: meters })
              .defaultRadiusMeters,
          }),
        setUnits: (units) => set({ units: units === 'imperial' ? 'imperial' : 'metric' }),
        setDataSource: (dataSource) =>
          set({ dataSource: sanitizeSettings({ dataSource }).dataSource }),
        setResultSort: (resultSort) =>
          set({ resultSort: sanitizeSettings({ resultSort }).resultSort }),
        reset: () => set(DEFAULT_SETTINGS),
      }),
      {
        name: SETTINGS_STORAGE_KEY,
        version: 1,
        storage,
        partialize: (s) => ({
          defaultRadiusMeters: s.defaultRadiusMeters,
          units: s.units,
          resultSort: s.resultSort,
          dataSource: s.dataSource,
        }),
        merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
        onRehydrateStorage: () => (_state, error) => {
          if (error) console.warn('Einstellungen konnten nicht geladen werden', error);
          markHydrated();
        },
      },
    ),
  );
  if (finishedEarly) store.setState({ hydrated: true });
  return store;
}

export const settingsStore = createSettingsStore();

export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}

export function useUnits(): Units {
  return useSettings((s) => s.units);
}
