import type { SourceCapabilities } from '@/services/places/capabilities';
import type { LatLng, PlaceSummary } from '@/types/place';

import { distanceMeters } from './geo';
import { trustScore } from './trust-score';

export type ResultSort = 'relevance' | 'trust' | 'distance';

export const RESULT_SORT_OPTIONS: readonly ResultSort[] = ['relevance', 'trust', 'distance'];

export const RESULT_SORT_LABEL: Record<ResultSort, string> = {
  relevance: 'Relevanz',
  trust: 'Vertrauensscore',
  distance: 'Entfernung',
};

/** Ohne Bewertungen in der Quelle gibt es keinen Vertrauensscore → Relevanz. */
export function effectiveSort(sort: ResultSort, caps: SourceCapabilities): ResultSort {
  return sort === 'trust' && !caps.ratings ? 'relevance' : sort;
}

export function availableSorts(caps: SourceCapabilities): ResultSort[] {
  return RESULT_SORT_OPTIONS.filter((s) => s !== 'trust' || caps.ratings);
}

/**
 * Sortiert Treffer clientseitig. „Relevanz“ = Reihenfolge der Datenquelle.
 * Ohne Score bzw. ohne Standort bleiben Orte in ihrer Relevanz-Reihenfolge am Ende.
 * Entfernung ohne eigenen Standort fällt auf Relevanz zurück.
 */
export function sortPlaces(
  places: readonly PlaceSummary[],
  sort: ResultSort,
  userLocation: LatLng | null,
): PlaceSummary[] {
  if (sort === 'relevance' || (sort === 'distance' && !userLocation)) return [...places];

  const key = (p: PlaceSummary): number | null =>
    sort === 'trust'
      ? trustScore(p.rating, p.ratingCount)
      : distanceMeters(userLocation!, p.location);

  return places
    .map((place, index) => ({ place, index, value: key(place) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      const diff = sort === 'trust' ? b.value - a.value : a.value - b.value;
      return diff || a.index - b.index;
    })
    .map(({ place }) => place);
}
