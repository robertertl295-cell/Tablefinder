import type { Favorite } from '@/types/favorites';
import type { LatLng, PlaceSummary } from '@/types/place';

import { distanceMeters } from './geo';
import { trustScore } from './trust-score';

/** Eine horizontale Reihe auf der Entdecken-Ansicht („Top bewertet in deiner Nähe“ …). */
export type DiscoverRow = { id: string; title: string; places: PlaceSummary[] };

const MAX_PER_ROW = 10;
/** Kürzere Reihen wirken leer – dann lieber weglassen. */
const MIN_PER_ROW = 3;
/** Ab so vielen Bewertungen zählt ein Lokal als „top bewertet“. */
const MIN_RATINGS_FOR_TOP = 20;

/**
 * Reihen aus den bereits geladenen Treffern – keine zusätzlichen Abfragen.
 * Jede Reihe nur, wenn sie mindestens drei Lokale hat.
 */
export function discoverRows(
  places: readonly PlaceSummary[],
  favorites: Readonly<Record<string, Favorite>>,
  userLocation: LatLng | null,
): DiscoverRow[] {
  const byDistance = (a: PlaceSummary, b: PlaceSummary) =>
    userLocation
      ? distanceMeters(userLocation, a.location) - distanceMeters(userLocation, b.location)
      : 0;
  const score = (p: PlaceSummary) => trustScore(p.rating, p.ratingCount) ?? 0;

  const rows: DiscoverRow[] = [
    {
      id: 'top',
      title: userLocation ? 'Top bewertet in deiner Nähe' : 'Top bewertet',
      places: places
        .filter((p) => p.rating !== null && p.ratingCount >= MIN_RATINGS_FOR_TOP)
        .sort((a, b) => score(b) - score(a)),
    },
    {
      id: 'open',
      title: 'Jetzt geöffnet',
      places: places.filter((p) => p.openNow === true).sort(byDistance),
    },
    {
      id: 'terrace',
      title: 'Draußen sitzen',
      places: places.filter((p) => p.attributes.outdoorSeating === true).sort(byDistance),
    },
    {
      id: 'veggie',
      title: 'Vegan & vegetarisch',
      places: places
        .filter((p) => p.attributes.vegan === true || p.attributes.vegetarian === true)
        .sort(byDistance),
    },
    {
      id: 'cheap',
      title: 'Günstig essen',
      places: places.filter((p) => p.priceLevel !== null && p.priceLevel <= 2).sort(byDistance),
    },
    {
      id: 'untried',
      title: 'Gemerkt, noch nicht besucht',
      places: places.filter((p) => favorites[p.id] && !favorites[p.id]!.visited).sort(byDistance),
    },
  ];
  return rows
    .map((r) => ({ ...r, places: r.places.slice(0, MAX_PER_ROW) }))
    .filter((r) => r.places.length >= MIN_PER_ROW);
}
