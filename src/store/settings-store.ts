import { useStore } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { DEFAULT_RADIUS_METERS } from '@/services/config';
import { persistStorage } from '@/services/storage';
import { RADIUS_OPTIONS } from '@/utils/filters';
import type { Units } from '@/utils/format';

export const RADIUS_SETTING_OPTIONS = RADIUS_OPTIONS;

export type Settings = {
  defaultRadiusMeters: number;
  units: Units;
};

export type SettingsState = Settings & {
  hydrated: boolean;
  setDefaultRadius: (meters: number) => void;
  setUnits: (units: Units) => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultRadiusMeters: DEFAULT_RADIUS_METERS,
  units: 'metric',
};

export const SETTINGS_STORAGE_KEY = 'tisch.settings';

export function sanitizeSettings(input: unknown): Settings {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  return {
    defaultRadiusMeters: (RADIUS_SETTING_OPTIONS as readonly unknown[]).includes(
      raw.defaultRadiusMeters,
    )
      ? (raw.defaultRadiusMeters as number)
      : DEFAULT_SETTINGS.defaultRadiusMeters,
    units: raw.units === 'imperial' ? 'imperial' : 'metric',
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
        reset: () => set(DEFAULT_SETTINGS),
      }),
      {
        name: SETTINGS_STORAGE_KEY,
        version: 1,
        storage,
        partialize: (s) => ({ defaultRadiusMeters: s.defaultRadiusMeters, units: s.units }),
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
