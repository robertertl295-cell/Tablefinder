import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { persistStorage } from '@/services/storage';

/**
 * Zuordnung OpenStreetMap-Lokal → Google-place_id, damit die App ein OSM-Lokal nicht bei
 * jedem Öffnen erneut bei Google suchen muss. Google erlaubt, place_ids dauerhaft zu
 * speichern – Inhalte (Name, Bewertung …) werden hier nie abgelegt.
 */
export type PlaceLinksState = {
  links: Record<string, string>;
  setLink: (osmId: string, googleId: string) => void;
  clear: () => void;
};

type Persisted = { links: Record<string, string> };

export const PLACE_LINKS_STORAGE_KEY = 'tablefinder.placeLinks';
/** Obergrenze, damit der Speicher nicht endlos wächst (älteste fallen heraus). */
const MAX_LINKS = 2000;

export function createPlaceLinksStore(
  storage: PersistStorage<Persisted> | undefined = persistStorage as PersistStorage<Persisted>,
): StoreApi<PlaceLinksState> {
  return createStore<PlaceLinksState>()(
    persist(
      (set, get) => ({
        links: {},
        setLink: (osmId, googleId) => {
          const entries = Object.entries({ ...get().links, [osmId]: googleId });
          set({ links: Object.fromEntries(entries.slice(-MAX_LINKS)) });
        },
        clear: () => set({ links: {} }),
      }),
      {
        name: PLACE_LINKS_STORAGE_KEY,
        version: 1,
        storage,
        partialize: (s) => ({ links: s.links }),
        merge: (persisted, current) => {
          const raw = (persisted as Partial<Persisted> | undefined)?.links;
          const links: Record<string, string> = {};
          if (raw && typeof raw === 'object') {
            for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') links[k] = v;
          }
          return { ...current, links };
        },
      },
    ),
  );
}

export const placeLinksStore = createPlaceLinksStore();
