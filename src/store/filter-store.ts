import { useStore } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { persistStorage } from '@/services/storage';
import { settingsStore } from '@/store/settings-store';
import type { Filters } from '@/types/filters';
import { createDefaultFilters, sanitizeFilters } from '@/utils/filters';

export type FilterState = {
  filters: Filters;
  /** true, sobald gespeicherte Filter geladen sind (vorher nicht suchen). */
  hydrated: boolean;
  setFilters: (filters: Filters) => void;
  reset: () => void;
};

type Persisted = { filters: Filters };

export const FILTER_STORAGE_KEY = 'tisch.filters';

export function createFilterStore(
  storage: PersistStorage<Persisted> | undefined = persistStorage as PersistStorage<Persisted>,
): StoreApi<FilterState> {
  // „hydrated“ auch setzen, wenn das Laden fehlschlägt – sonst würde die App nie suchen.
  let store: StoreApi<FilterState> | undefined;
  let finishedEarly = false;
  const markHydrated = () => {
    if (store) store.setState({ hydrated: true });
    else finishedEarly = true;
  };

  store = createStore<FilterState>()(
    persist(
      (set) => ({
        filters: createDefaultFilters(settingsStore.getState().defaultRadiusMeters),
        hydrated: false,
        setFilters: (filters) => set({ filters: sanitizeFilters(filters) }),
        // Radius bleibt beim Zurücksetzen auf dem Standard aus den Einstellungen.
        reset: () =>
          set({ filters: createDefaultFilters(settingsStore.getState().defaultRadiusMeters) }),
      }),
      {
        name: FILTER_STORAGE_KEY,
        version: 1,
        storage,
        partialize: (s) => ({ filters: s.filters }),
        // Gespeicherte Werte immer prüfen – nie blind übernehmen.
        merge: (persisted, current) => ({
          ...current,
          filters: sanitizeFilters((persisted as Partial<Persisted> | undefined)?.filters),
        }),
        onRehydrateStorage: () => (_state, error) => {
          if (error) console.warn('Filter konnten nicht geladen werden', error);
          markHydrated();
        },
      },
    ),
  );
  if (finishedEarly) store.setState({ hydrated: true });
  return store;
}

export const filterStore = createFilterStore();

export function useFilters<T>(selector: (state: FilterState) => T): T {
  return useStore(filterStore, selector);
}
