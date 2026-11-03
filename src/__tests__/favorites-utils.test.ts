import type { Favorite, FavoriteList } from '@/types/favorites';
import type { PlaceSummary } from '@/types/place';
import {
  createBackup,
  mergeBackup,
  parseBackup,
  sanitizeFavorites,
  sanitizeLists,
  selectFavorites,
} from '@/utils/favorites';
import { circleAround } from '@/utils/map-region';

const fav = (placeId: string, patch: Partial<Favorite> = {}): Favorite => ({
  placeId,
  listIds: [],
  note: '',
  visited: false,
  ownRating: null,
  addedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});
const list = (id: string, name: string): FavoriteList => ({
  id,
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('Prüfung gespeicherter/importierter Daten', () => {
  it('sanitizeLists verwirft Ungültiges und Doppelte', () => {
    expect(
      sanitizeLists([
        list('a', '  Date-Abend  '),
        { id: 'a', name: 'doppelt' },
        { id: '', name: 'ohne id' },
        { id: 'b', name: '   ' },
        'Unsinn',
      ]),
    ).toEqual([list('a', 'Date-Abend')]);
  });

  it('sanitizeFavorites begrenzt Werte und entfernt unbekannte Listen', () => {
    const [f] = sanitizeFavorites(
      [
        {
          placeId: 'p1',
          listIds: ['a', 'gibt-es-nicht', 'a'],
          note: 'x'.repeat(5000),
          visited: 'ja',
          ownRating: 7,
          addedAt: 'kein Datum',
        },
      ],
      new Set(['a']),
    );
    expect(f).toMatchObject({ placeId: 'p1', listIds: ['a'], visited: false, ownRating: null });
    expect(f?.note).toHaveLength(2000);
  });
});

describe('parseBackup', () => {
  const valid = createBackup([list('a', 'Date')], [fav('p1', { listIds: ['a'], ownRating: 4 })]);

  it('liest eine gültige Sicherung (Rundreise)', () => {
    const result = parseBackup(JSON.stringify(valid));
    expect(result).toEqual({ ok: true, backup: valid, skipped: 0 });
  });

  it.each([
    ['kein JSON', '{kaputt', 'kein gültiges JSON'],
    ['fremde Datei', JSON.stringify({ hallo: 1 }), 'keine Favoriten-Sicherung von Tisch'],
    ['neuere Version', JSON.stringify({ ...valid, version: 2 }), 'neueren App-Version'],
  ])('lehnt %s ab', (_, text, message) => {
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });

  it('zählt übersprungene Einträge', () => {
    const result = parseBackup(
      JSON.stringify({ ...valid, favorites: [...valid.favorites, { foo: 1 }, null] }),
    );
    expect(result.ok && result.skipped).toBe(2);
  });
});

describe('mergeBackup', () => {
  it('übernimmt Neues, legt gleichnamige Listen zusammen, vereinigt Listen', () => {
    const current = {
      lists: [list('mine', 'Date-Abend')],
      favorites: { p1: fav('p1', { listIds: ['mine'], note: 'alt' }) },
    };
    const backup = createBackup(
      [list('theirs', 'date-abend'), list('x', 'Brunch')],
      [
        fav('p1', { listIds: ['x'], note: 'neu', updatedAt: '2026-06-01T00:00:00.000Z' }),
        fav('p2', { listIds: ['theirs'] }),
      ],
    );
    const merged = mergeBackup(current, backup);
    expect(merged.lists.map((l) => l.name)).toEqual(['Date-Abend', 'Brunch']);
    expect(merged.favorites.p1).toMatchObject({ note: 'neu', listIds: ['mine', 'x'] });
    expect(merged.favorites.p2?.listIds).toEqual(['mine']); // auf bestehende Liste abgebildet
    expect([merged.added, merged.updated]).toEqual([1, 1]);
  });

  it('behält die eigene Fassung, wenn sie neuer ist', () => {
    const current = {
      lists: [],
      favorites: { p1: fav('p1', { note: 'meins', updatedAt: '2026-09-01T00:00:00.000Z' }) },
    };
    const merged = mergeBackup(current, createBackup([], [fav('p1', { note: 'alt' })]));
    expect(merged.favorites.p1?.note).toBe('meins');
  });
});

describe('selectFavorites', () => {
  const place = (
    id: string,
    name: string,
    rating: number | null,
    ratingCount: number,
    lat: number,
  ) =>
    ({
      id,
      name,
      rating,
      ratingCount,
      location: { latitude: lat, longitude: 13.4 },
    }) as PlaceSummary;
  const favorites = [
    fav('a', { addedAt: '2026-01-03T00:00:00Z', ownRating: 3, visited: true, listIds: ['l'] }),
    fav('b', { addedAt: '2026-01-02T00:00:00Z', ownRating: 5 }),
    fav('c', { addedAt: '2026-01-01T00:00:00Z' }),
  ];
  const places = new Map([
    ['a', place('a', 'Zeta', 4.5, 2000, 52.6)], // viele Bewertungen
    ['b', place('b', 'Äpfel', 4.8, 3, 52.5)], // höherer Schnitt, aber nur 3 Bewertungen
    // c ist noch nicht geladen
  ]);
  const ids = (sort: Parameters<typeof selectFavorites>[1]['sort'], extra = {}) =>
    selectFavorites(favorites, { listId: null, visit: 'all', sort, ...extra }, places, {
      latitude: 52.5,
      longitude: 13.4,
    }).map((f) => f.placeId);

  it('sortiert nach Hinzufügen, Name (deutsch), Bewertungen, Entfernung', () => {
    expect(ids('added')).toEqual(['a', 'b', 'c']);
    expect(ids('name')).toEqual(['b', 'a', 'c']); // Ä vor Z, Ungeladenes ans Ende
    expect(ids('ownRating')).toEqual(['b', 'a', 'c']);
    expect(ids('rating')).toEqual(['b', 'a', 'c']);
    expect(ids('trust')).toEqual(['a', 'b', 'c']); // belastbare 4,5 schlägt 4,8 aus 3
    expect(ids('distance')).toEqual(['b', 'a', 'c']);
  });

  it('filtert nach Liste und Besuchsstatus', () => {
    expect(ids('added', { listId: 'l' })).toEqual(['a']);
    expect(ids('added', { visit: 'visited' })).toEqual(['a']);
    expect(ids('added', { visit: 'open' })).toEqual(['b', 'c']);
  });
});

describe('circleAround', () => {
  it('umschließt alle Punkte', () => {
    const { center, radiusMeters } = circleAround(
      [
        { latitude: 52.5, longitude: 13.4 },
        { latitude: 52.52, longitude: 13.44 },
      ],
      { latitude: 0, longitude: 0 },
    );
    expect(center.latitude).toBeCloseTo(52.51);
    expect(radiusMeters).toBeGreaterThan(1500);
  });

  it('nutzt ohne Punkte den Ersatz-Mittelpunkt', () => {
    expect(circleAround([], { latitude: 1, longitude: 2 })).toEqual({
      center: { latitude: 1, longitude: 2 },
      radiusMeters: 1500,
    });
  });
});
