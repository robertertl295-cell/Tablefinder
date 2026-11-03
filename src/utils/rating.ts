/** Ab dieser Anzahl gilt eine Bewertung nicht mehr als „wenig Datenbasis“. */
export const LOW_DATA_THRESHOLD = 30;
/** Ab dieser Anzahl gilt die Datenbasis als breit. */
export const BROAD_DATA_THRESHOLD = 200;

export type RatingConfidence = 'none' | 'low' | 'medium' | 'high';

export function ratingConfidence(ratingCount: number): RatingConfidence {
  if (ratingCount <= 0) return 'none';
  if (ratingCount < LOW_DATA_THRESHOLD) return 'low';
  if (ratingCount < BROAD_DATA_THRESHOLD) return 'medium';
  return 'high';
}

export const RATING_CONFIDENCE_LABEL: Record<RatingConfidence, string> = {
  none: 'Noch keine Bewertungen',
  low: 'Wenig Datenbasis',
  medium: 'Solide Datenbasis',
  high: 'Breite Datenbasis',
};
