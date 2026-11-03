import type { BusinessStatus, PlaceSummary } from '@/types/place';

import { formatCount, formatRating, PRICE_LEVEL_LABEL, spokenDistance } from './format';
import { RATING_CONFIDENCE_LABEL, ratingConfidence } from './rating';

export type StatusTone = 'success' | 'neutral' | 'warning' | 'danger';

/** Öffnungs-/Betriebsstatus als Text und Farbton. `null` = nichts anzeigen. */
export function placeStatus(
  openNow: boolean | null,
  businessStatus: BusinessStatus,
): { label: string; tone: StatusTone } | null {
  if (businessStatus === 'closed_permanently')
    return { label: 'Dauerhaft geschlossen', tone: 'danger' };
  if (businessStatus === 'closed_temporarily')
    return { label: 'Vorübergehend geschlossen', tone: 'warning' };
  if (openNow === true) return { label: 'Jetzt geöffnet', tone: 'success' };
  if (openNow === false) return { label: 'Geschlossen', tone: 'neutral' };
  return null;
}

/** Vollständige Beschreibung einer Ergebniskarte für Screenreader. */
export function placeAccessibilityLabel(
  place: PlaceSummary,
  distanceMeters: number | null,
): string {
  const parts = [place.name];
  if (place.typeLabel) parts.push(place.typeLabel);
  if (place.rating !== null && place.ratingCount > 0) {
    parts.push(
      `${formatRating(place.rating)} von 5 Sternen aus ${formatCount(place.ratingCount)} Bewertungen`,
    );
    if (ratingConfidence(place.ratingCount) === 'low') parts.push(RATING_CONFIDENCE_LABEL.low);
  } else {
    parts.push(RATING_CONFIDENCE_LABEL.none);
  }
  if (place.priceLevel !== null) parts.push(`Preisniveau ${PRICE_LEVEL_LABEL[place.priceLevel]}`);
  if (distanceMeters !== null) parts.push(`${spokenDistance(distanceMeters)} entfernt`);
  const status = placeStatus(place.openNow, place.businessStatus);
  if (status) parts.push(status.label);
  return parts.join(', ');
}
