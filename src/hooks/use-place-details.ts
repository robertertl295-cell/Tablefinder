import { useCallback, useEffect, useState } from 'react';

import { placesProvider } from '@/services/places';
import { toPlacesError, type PlacesError } from '@/services/places/errors';
import type { PlacesProvider } from '@/services/places/provider';
import type { PlaceDetails } from '@/types/place';

export type DetailsState =
  | { status: 'loading' }
  | { status: 'success'; details: PlaceDetails }
  | { status: 'error'; error: PlacesError };

type Result = { key: string } & (
  { status: 'success'; details: PlaceDetails } | { status: 'error'; error: PlacesError }
);

/**
 * Lädt die Details beim Öffnen (frisch bzw. aus dem kurzen Speicher-Cache).
 * Ergebnisse werden nie dauerhaft gespeichert.
 */
export function usePlaceDetails(
  id: string,
  provider: PlacesProvider = placesProvider,
): DetailsState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${id}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    provider.getDetails(id).then(
      (details) => !cancelled && setResult({ key, status: 'success', details }),
      (error: unknown) =>
        !cancelled && setResult({ key, status: 'error', error: toPlacesError(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, key, provider]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Ergebnis einer älteren Anfrage (anderer Ort/Versuch) zählt als „lädt“.
  if (!result || result.key !== key) return { status: 'loading', retry };
  return result.status === 'success'
    ? { status: 'success', details: result.details, retry }
    : { status: 'error', error: result.error, retry };
}
