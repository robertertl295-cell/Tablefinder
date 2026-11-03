import type { PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

import { categoryOf, isGastronomyPlace } from './place-types';
import type { SearchQuery } from './provider';

/** minRating auf die von Google erlaubten 0,5er-Schritte abrunden und begrenzen. */
export function normalizeMinRating(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(5, Math.floor(value * 2) / 2);
}

/**
 * Prüft einen Ort gegen die Bedingungen einer Suchanfrage.
 * Wird von allen Anbietern genutzt, damit das Ergebnis unabhängig davon ist,
 * welche Bedingungen die jeweilige API selbst unterstützt.
 */
export function matchesQuery(place: PlaceSummary, query: SearchQuery): boolean {
  if (!isGastronomyPlace(place.primaryType, place.types)) return false;
  if (distanceMeters(query.center, place.location) > query.radiusMeters) return false;

  if (query.category && !categoryOf(place.primaryType, place.types).includes(query.category)) {
    return false;
  }

  const minRating = normalizeMinRating(query.minRating);
  if (minRating !== undefined && (place.rating === null || place.rating < minRating)) return false;

  if (query.priceLevels && query.priceLevels.length > 0) {
    if (place.priceLevel === null || !query.priceLevels.includes(place.priceLevel)) return false;
  }

  if (query.openNow && place.openNow !== true) return false;

  return true;
}
