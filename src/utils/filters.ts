import { DEFAULT_RADIUS_METERS } from '@/services/config';
import { CATEGORY_LABEL, categoryOf } from '@/services/places/place-types';
import type { SearchQuery } from '@/services/places/provider';
import { normalizeMinRating } from '@/services/places/query-filter';
import type { AttributeKey, Filters, MealKey } from '@/types/filters';
import type { PlaceCategory, PlaceSummary, PriceLevel } from '@/types/place';

import { formatCount, formatDistance, formatPriceLevel, formatRating } from './format';

export const CATEGORY_OPTIONS: readonly PlaceCategory[] = [
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'takeaway',
  'fast_food',
];
export const RATING_OPTIONS = [3.5, 4, 4.5] as const;
export const RATING_COUNT_OPTIONS = [30, 100, 500] as const;
export const PRICE_OPTIONS: readonly PriceLevel[] = [1, 2, 3, 4];
export const RADIUS_OPTIONS = [500, 1000, 1500, 3000, 5000] as const;
export const ATTRIBUTE_OPTIONS: readonly AttributeKey[] = [
  'vegetarian',
  'outdoorSeating',
  'dogsAllowed',
  'goodForGroups',
  'goodForChildren',
];
export const MEAL_OPTIONS: readonly MealKey[] = ['breakfast', 'lunch', 'dinner'];

export const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  vegetarian: 'Vegetarisch',
  outdoorSeating: 'Außenplätze',
  dogsAllowed: 'Hundefreundlich',
  goodForGroups: 'Gut für Gruppen',
  goodForChildren: 'Kinderfreundlich',
};

export const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
};

export function createDefaultFilters(radiusMeters = DEFAULT_RADIUS_METERS): Filters {
  return {
    categories: [],
    minRating: null,
    minRatingCount: null,
    priceLevels: [],
    openNow: false,
    radiusMeters,
    attributes: [],
    meals: [],
  };
}

/** Merkmal-/Mahlzeit-Filter brauchen zusätzliche (teurere) Felder von der API. */
export function needsAttributes(f: Filters): boolean {
  return f.attributes.length > 0 || f.meals.length > 0;
}

/**
 * Teil der Filter, den die API selbst auswerten kann.
 * Die API kennt nur eine Kategorie; bei mehreren wird clientseitig gefiltert.
 */
export function filtersToQuery(
  f: Filters,
): Pick<SearchQuery, 'category' | 'minRating' | 'priceLevels' | 'openNow' | 'includeAttributes'> {
  return {
    category: f.categories.length === 1 ? f.categories[0] : undefined,
    minRating: f.minRating ?? undefined,
    priceLevels: f.priceLevels.length > 0 ? [...f.priceLevels].sort() : undefined,
    openNow: f.openNow || undefined,
    includeAttributes: needsAttributes(f) || undefined,
  };
}

/**
 * Vollständige Prüfung eines Ortes gegen alle Filter (außer Radius – der gehört zur Suche).
 * Fehlt eine Angabe (`null`), gilt das Merkmal als nicht erfüllt: lieber ein Treffer zu wenig
 * als ein Lokal, das sich vor Ort als unpassend herausstellt.
 */
export function matchesFilters(place: PlaceSummary, f: Filters): boolean {
  if (f.categories.length > 0) {
    const cats = categoryOf(place.primaryType, place.types);
    if (!f.categories.some((c) => cats.includes(c))) return false;
  }
  const minRating = normalizeMinRating(f.minRating ?? undefined);
  if (minRating !== undefined && (place.rating === null || place.rating < minRating)) return false;
  if (f.minRatingCount !== null && place.ratingCount < f.minRatingCount) return false;
  if (f.priceLevels.length > 0) {
    if (place.priceLevel === null || !f.priceLevels.includes(place.priceLevel)) return false;
  }
  if (f.openNow && place.openNow !== true) return false;
  if (f.attributes.some((a) => place.attributes[a] !== true)) return false;
  if (f.meals.some((m) => place.attributes[m] !== true)) return false;
  return true;
}

export type FilterChip = { id: string; label: string; remove: (f: Filters) => Filters };

const without = <T>(list: readonly T[], item: T): T[] => list.filter((x) => x !== item);

/** Aktive Filter als einzeln entfernbare Chips, in fester Reihenfolge. */
export function activeFilterChips(f: Filters, defaultRadius = DEFAULT_RADIUS_METERS): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const c of f.categories) {
    chips.push({
      id: `category:${c}`,
      label: CATEGORY_LABEL[c],
      remove: (x) => ({ ...x, categories: without(x.categories, c) }),
    });
  }
  if (f.openNow) {
    chips.push({
      id: 'openNow',
      label: 'Jetzt geöffnet',
      remove: (x) => ({ ...x, openNow: false }),
    });
  }
  if (f.minRating !== null) {
    chips.push({
      id: 'minRating',
      label: `ab ${formatRating(f.minRating)} ★`,
      remove: (x) => ({ ...x, minRating: null }),
    });
  }
  if (f.minRatingCount !== null) {
    chips.push({
      id: 'minRatingCount',
      label: `ab ${formatCount(f.minRatingCount)} Bewertungen`,
      remove: (x) => ({ ...x, minRatingCount: null }),
    });
  }
  if (f.priceLevels.length > 0) {
    chips.push({
      id: 'priceLevels',
      label: [...f.priceLevels].sort().map(formatPriceLevel).join(', '),
      remove: (x) => ({ ...x, priceLevels: [] }),
    });
  }
  if (f.radiusMeters !== defaultRadius) {
    chips.push({
      id: 'radius',
      label: `Umkreis ${formatDistance(f.radiusMeters)}`,
      remove: (x) => ({ ...x, radiusMeters: defaultRadius }),
    });
  }
  for (const a of f.attributes) {
    chips.push({
      id: `attribute:${a}`,
      label: ATTRIBUTE_LABEL[a],
      remove: (x) => ({ ...x, attributes: without(x.attributes, a) }),
    });
  }
  for (const m of f.meals) {
    chips.push({
      id: `meal:${m}`,
      label: MEAL_LABEL[m],
      remove: (x) => ({ ...x, meals: without(x.meals, m) }),
    });
  }
  return chips;
}

/** Stabiler Schlüssel, um Änderungen an Filtern zu erkennen (Reihenfolge egal). */
export function filtersKey(f: Filters): string {
  return JSON.stringify([
    [...f.categories].sort(),
    f.minRating,
    f.minRatingCount,
    [...f.priceLevels].sort(),
    f.openNow,
    f.radiusMeters,
    [...f.attributes].sort(),
    [...f.meals].sort(),
  ]);
}

/** Fügt hinzu oder entfernt (für Mehrfachauswahl). */
export function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? without(list, item) : [...list, item];
}

/**
 * Prüft gespeicherte Filter (z. B. nach einem App-Update) und ersetzt alles Ungültige
 * durch Standardwerte. Wirft nie.
 */
export function sanitizeFilters(input: unknown, defaultRadius = DEFAULT_RADIUS_METERS): Filters {
  const d = createDefaultFilters(defaultRadius);
  if (typeof input !== 'object' || input === null) return d;
  const raw = input as Record<string, unknown>;
  const pick = <T>(value: unknown, allowed: readonly T[]): T[] =>
    Array.isArray(value) ? [...new Set(value.filter((v): v is T => allowed.includes(v as T)))] : [];
  const oneOf = <T>(value: unknown, allowed: readonly T[]): T | null =>
    allowed.includes(value as T) ? (value as T) : null;

  return {
    categories: pick(raw.categories, CATEGORY_OPTIONS),
    minRating: oneOf(raw.minRating, RATING_OPTIONS),
    minRatingCount: oneOf(raw.minRatingCount, RATING_COUNT_OPTIONS),
    priceLevels: pick(raw.priceLevels, PRICE_OPTIONS),
    openNow: raw.openNow === true,
    radiusMeters: oneOf(raw.radiusMeters, RADIUS_OPTIONS) ?? d.radiusMeters,
    attributes: pick(raw.attributes, ATTRIBUTE_OPTIONS),
    meals: pick(raw.meals, MEAL_OPTIONS),
  };
}
