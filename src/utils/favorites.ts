import type { Favorite, FavoriteList, FavoritesBackup, OwnRating } from '@/types/favorites';
import type { LatLng, PlaceSummary } from '@/types/place';

import { distanceMeters } from './geo';
import { trustScore } from './trust-score';

export const MAX_NOTE_LENGTH = 2000;
export const MAX_LIST_NAME_LENGTH = 40;
export const LIST_NAME_SUGGESTIONS = ['Noch ausprobieren', 'Date-Abend', 'Mittagessen Uni'];

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeListName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_LIST_NAME_LENGTH);
}

// ---------------------------------------------------------------------------
// Prüfung fremder Daten (Import, gespeicherter Zustand)
// ---------------------------------------------------------------------------

const isString = (v: unknown): v is string => typeof v === 'string';
const isIsoDate = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));

function sanitizeRating(v: unknown): OwnRating | null {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5 ? v : null;
}

export function sanitizeLists(input: unknown): FavoriteList[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const lists: FavoriteList[] = [];
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const name = isString(r.name) ? normalizeListName(r.name) : '';
    if (!isString(r.id) || !r.id || !name || seen.has(r.id)) continue;
    seen.add(r.id);
    lists.push({
      id: r.id,
      name,
      createdAt: isIsoDate(r.createdAt) ? r.createdAt : new Date(0).toISOString(),
    });
  }
  return lists;
}

export function sanitizeFavorites(input: unknown, validListIds: ReadonlySet<string>): Favorite[] {
  if (!Array.isArray(input)) return [];
  const byId = new Map<string, Favorite>();
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (!isString(r.placeId) || !r.placeId.trim() || r.placeId.length > 512) continue;
    const addedAt = isIsoDate(r.addedAt) ? r.addedAt : new Date(0).toISOString();
    const listIds = Array.isArray(r.listIds)
      ? [...new Set(r.listIds.filter((id): id is string => isString(id) && validListIds.has(id)))]
      : [];
    byId.set(r.placeId, {
      placeId: r.placeId,
      listIds,
      note: isString(r.note) ? r.note.slice(0, MAX_NOTE_LENGTH) : '',
      visited: r.visited === true,
      ownRating: sanitizeRating(r.ownRating),
      addedAt,
      updatedAt: isIsoDate(r.updatedAt) ? r.updatedAt : addedAt,
    });
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

export function createBackup(
  lists: FavoriteList[],
  favorites: Favorite[],
  now = new Date(),
): FavoritesBackup {
  return {
    app: 'tablefinder',
    format: 'favorites',
    version: 1,
    exportedAt: now.toISOString(),
    lists,
    favorites,
  };
}

export type ParseResult =
  { ok: true; backup: FavoritesBackup; skipped: number } | { ok: false; error: string };

/** Liest eine Sicherungsdatei und prüft jeden Eintrag. Wirft nie. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Die Datei enthält keine Favoriten-Sicherung.' };
  }
  const d = data as Record<string, unknown>;
  // „tisch“ = früherer App-Name; solche Sicherungen bleiben importierbar.
  if ((d.app !== 'tablefinder' && d.app !== 'tisch') || d.format !== 'favorites') {
    return { ok: false, error: 'Die Datei ist keine Favoriten-Sicherung von Tablefinder.' };
  }
  if (typeof d.version !== 'number' || d.version > 1) {
    return {
      ok: false,
      error: 'Die Sicherung stammt aus einer neueren App-Version und kann nicht gelesen werden.',
    };
  }
  const lists = sanitizeLists(d.lists);
  const favorites = sanitizeFavorites(d.favorites, new Set(lists.map((l) => l.id)));
  const rawCount = Array.isArray(d.favorites) ? d.favorites.length : 0;
  return {
    ok: true,
    backup: createBackup(lists, favorites, new Date(isIsoDate(d.exportedAt) ? d.exportedAt : 0)),
    skipped: Math.max(0, rawCount - favorites.length),
  };
}

export type ImportMode = 'merge' | 'replace';

/**
 * Führt eine Sicherung mit dem aktuellen Stand zusammen.
 * - Listen: gleiche ID → bestehende bleibt; gleicher Name → wird zusammengelegt.
 * - Favoriten: neu → übernehmen; vorhanden → neuere Bearbeitung gewinnt, Listen werden vereinigt.
 */
export function mergeBackup(
  current: { lists: FavoriteList[]; favorites: Record<string, Favorite> },
  backup: FavoritesBackup,
): { lists: FavoriteList[]; favorites: Record<string, Favorite>; added: number; updated: number } {
  const lists = [...current.lists];
  const listIdMap = new Map<string, string>(); // importierte ID → ID im Bestand
  for (const imported of backup.lists) {
    const sameId = lists.find((l) => l.id === imported.id);
    const sameName = lists.find((l) => l.name.toLowerCase() === imported.name.toLowerCase());
    const target = sameId ?? sameName;
    if (target) listIdMap.set(imported.id, target.id);
    else {
      lists.push(imported);
      listIdMap.set(imported.id, imported.id);
    }
  }

  const favorites = { ...current.favorites };
  let added = 0;
  let updated = 0;
  for (const imported of backup.favorites) {
    const listIds = imported.listIds.map((id) => listIdMap.get(id) ?? id);
    const existing = favorites[imported.placeId];
    if (!existing) {
      favorites[imported.placeId] = { ...imported, listIds };
      added++;
      continue;
    }
    const newer = Date.parse(imported.updatedAt) > Date.parse(existing.updatedAt);
    favorites[imported.placeId] = {
      ...(newer ? imported : existing),
      listIds: [...new Set([...existing.listIds, ...listIds])],
      addedAt: existing.addedAt < imported.addedAt ? existing.addedAt : imported.addedAt,
    };
    updated++;
  }
  return { lists, favorites, added, updated };
}

// ---------------------------------------------------------------------------
// Anzeige: Filtern und Sortieren
// ---------------------------------------------------------------------------

export type FavoriteSort = 'added' | 'name' | 'ownRating' | 'trust' | 'rating' | 'distance';
export type VisitFilter = 'all' | 'visited' | 'open';

export const SORT_LABEL: Record<FavoriteSort, string> = {
  added: 'Zuletzt hinzugefügt',
  name: 'Name',
  ownRating: 'Eigene Bewertung',
  trust: 'Vertrauensscore',
  rating: 'Google-Bewertung',
  distance: 'Entfernung',
};

export const VISIT_LABEL: Record<VisitFilter, string> = {
  all: 'Alle',
  visited: 'Besucht',
  open: 'Noch nicht besucht',
};

export type FavoriteQuery = {
  listId: string | null;
  visit: VisitFilter;
  sort: FavoriteSort;
};

/**
 * Filtert und sortiert Favoriten. Orte, deren Daten (noch) fehlen, landen bei
 * Sortierungen nach Ortsdaten am Ende – in der Reihenfolge „zuletzt hinzugefügt“.
 */
export function selectFavorites(
  favorites: Favorite[],
  query: FavoriteQuery,
  places: ReadonlyMap<string, PlaceSummary>,
  userLocation: LatLng | null,
): Favorite[] {
  const filtered = favorites.filter(
    (f) =>
      (query.listId === null || f.listIds.includes(query.listId)) &&
      (query.visit === 'all' || (query.visit === 'visited' ? f.visited : !f.visited)),
  );

  const byAdded = (a: Favorite, b: Favorite) => b.addedAt.localeCompare(a.addedAt);
  const nullsLast =
    <T>(get: (f: Favorite) => T | null, cmp: (a: T, b: T) => number) =>
    (a: Favorite, b: Favorite) => {
      const va = get(a);
      const vb = get(b);
      if (va === null && vb === null) return byAdded(a, b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return cmp(va, vb) || byAdded(a, b);
    };

  const compare: Record<FavoriteSort, (a: Favorite, b: Favorite) => number> = {
    added: byAdded,
    name: nullsLast(
      (f) => places.get(f.placeId)?.name ?? null,
      (a, b) => a.localeCompare(b, 'de'),
    ),
    ownRating: nullsLast(
      (f) => f.ownRating,
      (a, b) => b - a,
    ),
    trust: nullsLast(
      (f) => {
        const p = places.get(f.placeId);
        return p ? trustScore(p.rating, p.ratingCount) : null;
      },
      (a, b) => b - a,
    ),
    rating: nullsLast(
      (f) => places.get(f.placeId)?.rating ?? null,
      (a, b) => b - a,
    ),
    distance: nullsLast(
      (f) => {
        const p = places.get(f.placeId);
        return p && userLocation ? distanceMeters(userLocation, p.location) : null;
      },
      (a, b) => a - b,
    ),
  };
  return [...filtered].sort(compare[query.sort]);
}
