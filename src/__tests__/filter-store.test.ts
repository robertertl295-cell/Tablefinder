import { createJSONStorage } from 'zustand/middleware';

import { createFilterStore, FILTER_STORAGE_KEY } from '@/store/filter-store';
import { createDefaultFilters } from '@/utils/filters';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    storage: createJSONStorage(() => ({
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => void data.set(k, v),
      removeItem: async (k: string) => void data.delete(k),
    })),
  };
}

const waitForHydration = async (store: ReturnType<typeof createFilterStore>) => {
  for (let i = 0; i < 20 && !store.getState().hydrated; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  expect(store.getState().hydrated).toBe(true);
};

describe('Filter-Store', () => {
  it('speichert Filter und stellt sie beim nächsten Start wieder her', async () => {
    const { storage } = memoryStorage();
    const first = createFilterStore(storage as never);
    await waitForHydration(first);
    first.getState().setFilters({
      ...createDefaultFilters(),
      openNow: true,
      categories: ['cafe'],
    });
    await new Promise((r) => setTimeout(r, 0));

    const second = createFilterStore(storage as never);
    await waitForHydration(second);
    expect(second.getState().filters.openNow).toBe(true);
    expect(second.getState().filters.categories).toEqual(['cafe']);
  });

  it('speichert nur die Filter, keine Laufzeit-Flags', async () => {
    const { storage, data } = memoryStorage();
    const store = createFilterStore(storage as never);
    await waitForHydration(store);
    store.getState().setFilters({ ...createDefaultFilters(), openNow: true });
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse(data.get(FILTER_STORAGE_KEY) ?? '{}');
    expect(Object.keys(saved.state)).toEqual(['filters']);
  });

  it('bereinigt kaputte gespeicherte Daten', async () => {
    const { storage } = memoryStorage({
      [FILTER_STORAGE_KEY]: JSON.stringify({
        state: { filters: { openNow: true, minRating: 99, categories: ['kino'] } },
        version: 1,
      }),
    });
    const store = createFilterStore(storage as never);
    await waitForHydration(store);
    expect(store.getState().filters).toEqual({ ...createDefaultFilters(), openNow: true });
  });

  it('ist auch bereit, wenn das Laden fehlschlägt', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = createJSONStorage(() => ({
      getItem: async () => {
        throw new Error('Datenbank kaputt');
      },
      setItem: async () => {},
      removeItem: async () => {},
    }));
    const store = createFilterStore(failing as never);
    await waitForHydration(store);
    expect(store.getState().filters).toEqual(createDefaultFilters());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('setzt zurück, ohne den Standard-Radius zu verlieren', async () => {
    const { storage } = memoryStorage();
    const store = createFilterStore(storage as never);
    await waitForHydration(store);
    store.getState().setFilters({ ...createDefaultFilters(), radiusMeters: 5000, openNow: true });
    store.getState().reset();
    expect(store.getState().filters).toEqual(createDefaultFilters());
  });
});
