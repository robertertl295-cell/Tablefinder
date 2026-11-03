import { useStore } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { persistStorage } from '@/services/storage';
import type { Favorite, FavoriteList, FavoritesBackup, OwnRating } from '@/types/favorites';
import {
  createBackup,
  createId,
  MAX_NOTE_LENGTH,
  mergeBackup,
  normalizeListName,
  sanitizeFavorites,
  sanitizeLists,
  type ImportMode,
} from '@/utils/favorites';

export type FavoritePatch = Partial<Pick<Favorite, 'note' | 'visited' | 'ownRating'>>;

export type FavoritesState = {
  lists: FavoriteList[];
  favorites: Record<string, Favorite>;
  hydrated: boolean;

  addFavorite: (placeId: string, listIds?: string[]) => void;
  removeFavorite: (placeId: string) => void;
  updateFavorite: (placeId: string, patch: FavoritePatch) => void;
  /** Zuordnung eines Favoriten zu einer Liste an- oder abschalten. */
  toggleList: (placeId: string, listId: string) => void;

  createList: (name: string) => string | null;
  renameList: (listId: string, name: string) => void;
  /** Löscht die Liste; die Favoriten selbst bleiben erhalten. */
  deleteList: (listId: string) => void;

  exportBackup: () => FavoritesBackup;
  importBackup: (backup: FavoritesBackup, mode: ImportMode) => { added: number; updated: number };
  clearAll: () => void;
};

type Persisted = Pick<FavoritesState, 'lists' | 'favorites'>;

export const FAVORITES_STORAGE_KEY = 'tablefinder.favorites';

const nowIso = () => new Date().toISOString();

export function createFavoritesStore(
  storage: PersistStorage<Persisted> | undefined = persistStorage as PersistStorage<Persisted>,
): StoreApi<FavoritesState> {
  let store: StoreApi<FavoritesState> | undefined;
  let finishedEarly = false;
  const markHydrated = () => {
    if (store) store.setState({ hydrated: true });
    else finishedEarly = true;
  };

  store = createStore<FavoritesState>()(
    persist(
      (set, get) => {
        const patchFavorite = (placeId: string, change: (f: Favorite) => Favorite) => {
          const existing = get().favorites[placeId];
          if (!existing) return;
          set({
            favorites: {
              ...get().favorites,
              [placeId]: { ...change(existing), updatedAt: nowIso() },
            },
          });
        };

        return {
          lists: [],
          favorites: {},
          hydrated: false,

          addFavorite: (placeId, listIds = []) => {
            if (get().favorites[placeId]) return;
            const validIds = new Set(get().lists.map((l) => l.id));
            const now = nowIso();
            set({
              favorites: {
                ...get().favorites,
                [placeId]: {
                  placeId,
                  listIds: listIds.filter((id) => validIds.has(id)),
                  note: '',
                  visited: false,
                  ownRating: null,
                  addedAt: now,
                  updatedAt: now,
                },
              },
            });
          },

          removeFavorite: (placeId) => {
            const { [placeId]: _removed, ...rest } = get().favorites;
            set({ favorites: rest });
          },

          updateFavorite: (placeId, patch) =>
            patchFavorite(placeId, (f) => ({
              ...f,
              ...(patch.note !== undefined && { note: patch.note.slice(0, MAX_NOTE_LENGTH) }),
              ...(patch.visited !== undefined && { visited: patch.visited }),
              ...(patch.ownRating !== undefined && {
                ownRating: patch.ownRating as OwnRating | null,
              }),
            })),

          toggleList: (placeId, listId) => {
            if (!get().lists.some((l) => l.id === listId)) return;
            patchFavorite(placeId, (f) => ({
              ...f,
              listIds: f.listIds.includes(listId)
                ? f.listIds.filter((id) => id !== listId)
                : [...f.listIds, listId],
            }));
          },

          createList: (rawName) => {
            const name = normalizeListName(rawName);
            if (!name) return null;
            const duplicate = get().lists.find((l) => l.name.toLowerCase() === name.toLowerCase());
            if (duplicate) return duplicate.id;
            const list: FavoriteList = { id: createId('list'), name, createdAt: nowIso() };
            set({ lists: [...get().lists, list] });
            return list.id;
          },

          renameList: (listId, rawName) => {
            const name = normalizeListName(rawName);
            if (!name) return;
            set({ lists: get().lists.map((l) => (l.id === listId ? { ...l, name } : l)) });
          },

          deleteList: (listId) => {
            const favorites: Record<string, Favorite> = {};
            for (const [id, f] of Object.entries(get().favorites)) {
              favorites[id] = f.listIds.includes(listId)
                ? { ...f, listIds: f.listIds.filter((l) => l !== listId) }
                : f;
            }
            set({ lists: get().lists.filter((l) => l.id !== listId), favorites });
          },

          exportBackup: () => createBackup(get().lists, Object.values(get().favorites)),

          importBackup: (backup, mode) => {
            if (mode === 'replace') {
              const favorites = Object.fromEntries(backup.favorites.map((f) => [f.placeId, f]));
              set({ lists: backup.lists, favorites });
              return { added: backup.favorites.length, updated: 0 };
            }
            const merged = mergeBackup(get(), backup);
            set({ lists: merged.lists, favorites: merged.favorites });
            return { added: merged.added, updated: merged.updated };
          },

          clearAll: () => set({ lists: [], favorites: {} }),
        };
      },
      {
        name: FAVORITES_STORAGE_KEY,
        version: 1,
        storage,
        partialize: (s) => ({ lists: s.lists, favorites: s.favorites }),
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<Persisted>;
          const lists = sanitizeLists(p.lists);
          const favorites = sanitizeFavorites(
            p.favorites ? Object.values(p.favorites) : [],
            new Set(lists.map((l) => l.id)),
          );
          return {
            ...current,
            lists,
            favorites: Object.fromEntries(favorites.map((f) => [f.placeId, f])),
          };
        },
        onRehydrateStorage: () => (_state, error) => {
          if (error) console.warn('Favoriten konnten nicht geladen werden', error);
          markHydrated();
        },
      },
    ),
  );
  if (finishedEarly) store.setState({ hydrated: true });
  return store;
}

export const favoritesStore = createFavoritesStore();

export function useFavorites<T>(selector: (state: FavoritesState) => T): T {
  return useStore(favoritesStore, selector);
}

export function useIsFavorite(placeId: string): boolean {
  return useFavorites((s) => placeId in s.favorites);
}
