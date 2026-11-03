import { createJSONStorage } from 'zustand/middleware';

import { createFavoritesStore, FAVORITES_STORAGE_KEY } from '@/store/favorites-store';
import { createBackup } from '@/utils/favorites';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    storage: createJSONStorage(() => ({
      getItem: async (k: string) => data.get(k) ?? null,
      setItem: async (k: string, v: string) => void data.set(k, v),
      removeItem: async (k: string) => void data.delete(k),
    })) as never,
  };
}

async function setup(initial: Record<string, string> = {}) {
  const mem = memoryStorage(initial);
  const store = createFavoritesStore(mem.storage);
  for (let i = 0; i < 20 && !store.getState().hydrated; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  expect(store.getState().hydrated).toBe(true);
  return { store, ...mem };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('Favoriten', () => {
  it('fügt hinzu (einmalig) und entfernt', async () => {
    const { store } = await setup();
    store.getState().addFavorite('p1');
    store.getState().updateFavorite('p1', { note: 'Notiz' });
    store.getState().addFavorite('p1'); // überschreibt nicht
    expect(store.getState().favorites.p1?.note).toBe('Notiz');
    store.getState().removeFavorite('p1');
    expect(store.getState().favorites).toEqual({});
  });

  it('speichert eigene Angaben und setzt updatedAt', async () => {
    const { store } = await setup();
    store.getState().addFavorite('p1');
    const before = store.getState().favorites.p1!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    store.getState().updateFavorite('p1', { visited: true, ownRating: 4, note: 'x'.repeat(3000) });
    const f = store.getState().favorites.p1!;
    expect(f).toMatchObject({ visited: true, ownRating: 4 });
    expect(f.note).toHaveLength(2000);
    expect(f.updatedAt > before).toBe(true);
    store.getState().updateFavorite('p1', { ownRating: null });
    expect(store.getState().favorites.p1?.ownRating).toBeNull();
  });

  it('ignoriert Änderungen an unbekannten Favoriten', async () => {
    const { store } = await setup();
    store.getState().updateFavorite('nope', { visited: true });
    expect(store.getState().favorites).toEqual({});
  });
});

describe('Listen', () => {
  it('legt an (ohne Dubletten), benennt um und ordnet zu', async () => {
    const { store } = await setup();
    const id = store.getState().createList('  Date-Abend ')!;
    expect(store.getState().createList('date-abend')).toBe(id);
    expect(store.getState().createList('   ')).toBeNull();
    store.getState().renameList(id, 'Date');
    expect(store.getState().lists).toEqual([expect.objectContaining({ id, name: 'Date' })]);

    store.getState().addFavorite('p1', [id, 'unbekannt']);
    expect(store.getState().favorites.p1?.listIds).toEqual([id]);
    store.getState().toggleList('p1', id);
    expect(store.getState().favorites.p1?.listIds).toEqual([]);
    store.getState().toggleList('p1', id);
    expect(store.getState().favorites.p1?.listIds).toEqual([id]);
  });

  it('löscht eine Liste, die Favoriten bleiben', async () => {
    const { store } = await setup();
    const id = store.getState().createList('Brunch')!;
    store.getState().addFavorite('p1', [id]);
    store.getState().deleteList(id);
    expect(store.getState().lists).toEqual([]);
    expect(store.getState().favorites.p1?.listIds).toEqual([]);
  });
});

describe('Persistenz', () => {
  it('stellt Favoriten und Listen nach einem Neustart wieder her', async () => {
    const first = await setup();
    const id = first.store.getState().createList('Uni')!;
    first.store.getState().addFavorite('p1', [id]);
    first.store.getState().updateFavorite('p1', { note: 'Mensa-Alternative' });
    await flush();

    const second = createFavoritesStore(first.storage);
    for (let i = 0; i < 20 && !second.getState().hydrated; i++) await flush();
    expect(second.getState().lists[0]?.name).toBe('Uni');
    expect(second.getState().favorites.p1).toMatchObject({
      note: 'Mensa-Alternative',
      listIds: [id],
    });
  });

  it('speichert nur place_id und eigene Angaben – keine Ortsdaten', async () => {
    const { store, data } = await setup();
    store.getState().addFavorite('p1');
    await flush();
    const saved = JSON.parse(data.get(FAVORITES_STORAGE_KEY)!).state;
    expect(Object.keys(saved).sort()).toEqual(['favorites', 'lists']);
    expect(Object.keys(saved.favorites.p1).sort()).toEqual(
      ['addedAt', 'listIds', 'note', 'ownRating', 'placeId', 'updatedAt', 'visited'].sort(),
    );
  });

  it('bereinigt kaputte gespeicherte Daten', async () => {
    const { store } = await setup({
      [FAVORITES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        state: {
          lists: [{ id: 'a', name: 'A' }, { name: 'ohne id' }],
          favorites: { p1: { placeId: 'p1', listIds: ['a', 'weg'], ownRating: 9 }, x: 'Unsinn' },
        },
      }),
    });
    expect(store.getState().lists).toHaveLength(1);
    expect(store.getState().favorites.p1).toMatchObject({ listIds: ['a'], ownRating: null });
    expect(Object.keys(store.getState().favorites)).toEqual(['p1']);
  });
});

describe('Export und Import', () => {
  it('Rundreise: Export → Ersetzen ergibt denselben Stand', async () => {
    const a = await setup();
    const id = a.store.getState().createList('Date')!;
    a.store.getState().addFavorite('p1', [id]);
    a.store.getState().updateFavorite('p1', { ownRating: 5, visited: true });
    const backup = a.store.getState().exportBackup();
    expect(backup).toMatchObject({ app: 'tablefinder', format: 'favorites', version: 1 });

    const b = await setup();
    b.store.getState().addFavorite('wird-ersetzt');
    expect(b.store.getState().importBackup(backup, 'replace')).toEqual({ added: 1, updated: 0 });
    expect(b.store.getState().lists).toEqual(a.store.getState().lists);
    expect(b.store.getState().favorites).toEqual(a.store.getState().favorites);
  });

  it('Zusammenführen behält Bestehendes', async () => {
    const { store } = await setup();
    store.getState().addFavorite('mine');
    const backup = createBackup(
      [],
      [
        {
          placeId: 'theirs',
          listIds: [],
          note: '',
          visited: false,
          ownRating: null,
          addedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    );
    expect(store.getState().importBackup(backup, 'merge')).toEqual({ added: 1, updated: 0 });
    expect(Object.keys(store.getState().favorites).sort()).toEqual(['mine', 'theirs']);
  });

  it('clearAll löscht alles', async () => {
    const { store } = await setup();
    store.getState().createList('x');
    store.getState().addFavorite('p1');
    store.getState().clearAll();
    expect(store.getState().lists).toEqual([]);
    expect(store.getState().favorites).toEqual({});
  });
});
