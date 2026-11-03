import type { PlaceCategory } from '@/types/place';

/**
 * Gastronomische Place-Typen (Google Places API New, Tabelle A „Food and Drink“).
 * Zusätzlich gilt alles mit Endung `_restaurant`, `_cafe` oder `_bar` als Gastronomie.
 */
const GASTRONOMY_TYPES = new Set<string>([
  'restaurant',
  'cafe',
  'coffee_shop',
  'cafeteria',
  'bar',
  'pub',
  'bakery',
  'bagel_shop',
  'meal_takeaway',
  'fast_food_restaurant',
  'sandwich_shop',
  'deli',
  'diner',
  'steak_house',
  'food_court',
  'ice_cream_shop',
  'dessert_shop',
  'donut_shop',
  'juice_shop',
  'acai_shop',
  'tea_house',
  'confectionery',
]);

const GASTRONOMY_SUFFIXES = ['_restaurant', '_cafe', '_bar'];

export function isGastronomyType(type: string): boolean {
  return GASTRONOMY_TYPES.has(type) || GASTRONOMY_SUFFIXES.some((s) => type.endsWith(s));
}

/**
 * Entscheidet, ob ein Ort zur App passt.
 * Maßgeblich ist der Haupttyp: ein Hotel mit Restaurant (`primaryType: hotel`) fliegt raus.
 * Fehlt der Haupttyp, reicht ein gastronomischer Typ in der Liste.
 */
export function isGastronomyPlace(primaryType: string | null, types: readonly string[]): boolean {
  if (primaryType) return isGastronomyType(primaryType);
  return types.some(isGastronomyType);
}

/** Typen für die Umgebungssuche ohne Suchbegriff (Nearby Search, max. 50 erlaubt). */
export const NEARBY_INCLUDED_TYPES = [
  'restaurant',
  'cafe',
  'coffee_shop',
  'bar',
  'pub',
  'wine_bar',
  'bakery',
  'meal_takeaway',
  'fast_food_restaurant',
  'sandwich_shop',
  'ice_cream_shop',
  'tea_house',
] as const;

/** Google-Typ je Kategorie (für `includedType`). */
export const CATEGORY_TO_GOOGLE_TYPE: Record<PlaceCategory, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bar: 'bar',
  bakery: 'bakery',
  takeaway: 'meal_takeaway',
  fast_food: 'fast_food_restaurant',
};

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  bakery: 'Bäckerei',
  takeaway: 'Imbiss',
  fast_food: 'Fast Food',
};

/** Zuordnung eines konkreten Typs zu einer Kategorie (für clientseitige Filterung). */
export function categoryOf(primaryType: string | null, types: readonly string[]): PlaceCategory[] {
  const all = primaryType ? [primaryType, ...types] : [...types];
  const result = new Set<PlaceCategory>();
  for (const t of all) {
    if (t === 'cafe' || t === 'coffee_shop' || t === 'tea_house' || t.endsWith('_cafe'))
      result.add('cafe');
    else if (t === 'bar' || t === 'pub' || t.endsWith('_bar')) result.add('bar');
    else if (t === 'bakery' || t === 'bagel_shop') result.add('bakery');
    else if (t === 'meal_takeaway' || t === 'sandwich_shop') result.add('takeaway');
    else if (t === 'fast_food_restaurant') result.add('fast_food');
    if (t === 'restaurant' || t.endsWith('_restaurant')) result.add('restaurant');
  }
  return [...result];
}
