/**
 * Vertrauensscore: bereinigter Bewertungsschnitt nach Bayes.
 *
 *   score = (k · m + n · r) / (k + n)
 *
 * r = Google-Schnitt, n = Anzahl Bewertungen,
 * m = angenommener Durchschnitt Berliner Gastronomie, k = Gewicht dieser Annahme
 * (entspricht k „durchschnittlichen“ Bewertungen, die jedem Lokal hinzugefügt werden).
 *
 * Wenige Bewertungen → der Score liegt nahe am Durchschnitt.
 * Viele Bewertungen → der Score liegt nahe am echten Schnitt.
 */

/** Angenommener Durchschnitt Berliner Gastronomie bei Google (bewusst konservativ). */
export const TRUST_PRIOR_MEAN = 4.3;
/** Gewicht der Annahme in „Bewertungen“; passt zur Schwelle „wenig Datenbasis“ (30). */
export const TRUST_PRIOR_WEIGHT = 25;

export function trustScore(
  rating: number | null,
  ratingCount: number,
  prior = TRUST_PRIOR_MEAN,
  weight = TRUST_PRIOR_WEIGHT,
): number | null {
  if (rating === null || !Number.isFinite(rating)) return null;
  if (!Number.isFinite(ratingCount) || ratingCount <= 0) return null;
  return (weight * prior + ratingCount * rating) / (weight + ratingCount);
}

/** Wie stark der Score vom Google-Schnitt abweicht (für die Erklärung). */
export type TrustAdjustment = 'none' | 'down' | 'up';

export function trustAdjustment(rating: number, score: number): TrustAdjustment {
  const diff = score - rating;
  if (Math.abs(diff) < 0.05) return 'none';
  return diff < 0 ? 'down' : 'up';
}

/** Ein Satz, der den Score für dieses Lokal erklärt. */
export function trustExplanation(rating: number, ratingCount: number, score: number): string {
  switch (trustAdjustment(rating, score)) {
    case 'none':
      return 'Genug Bewertungen – der Schnitt ist belastbar und bleibt praktisch unverändert.';
    case 'down':
      return 'Wenige sehr gute Bewertungen zählen weniger, bis mehr Stimmen sie bestätigen.';
    case 'up':
      return ratingCount < TRUST_PRIOR_WEIGHT
        ? 'Wenige schwache Bewertungen zählen weniger, bis mehr Stimmen sie bestätigen.'
        : 'Leicht angehoben, weil die Datenbasis noch überschaubar ist.';
  }
}
