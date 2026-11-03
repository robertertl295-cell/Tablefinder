import { useCallback, useEffect, useRef, useState } from 'react';

import { placesProvider } from '@/services/places';
import { toPlacesError, type PlacesError } from '@/services/places/errors';
import type { PlacesProvider } from '@/services/places/provider';
import type { PlaceSummary } from '@/types/place';

export type FavoritePlaceEntry =
  | { status: 'loading' }
  | { status: 'loaded'; place: PlaceSummary }
  | { status: 'error'; error: PlacesError };

const CONCURRENCY = 4;

/**
 * Lädt die aktuellen Ortsdaten der Favoriten (nur Kartenfelder, frisch bzw. aus dem
 * 5-Minuten-Speicher). Nichts davon wird dauerhaft gespeichert.
 */
export function useFavoritePlaces(
  placeIds: readonly string[],
  provider: PlacesProvider = placesProvider,
) {
  const [results, setResults] = useState<Record<string, FavoritePlaceEntry>>({});
  const [generation, setGeneration] = useState(0);
  const requested = useRef(new Set<string>());
  const idsKey = placeIds.join('|');

  useEffect(() => {
    let cancelled = false;
    const queue = idsKey.split('|').filter((id) => id && !requested.current.has(id));
    queue.forEach((id) => requested.current.add(id));

    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        const current = id;
        let entry: FavoritePlaceEntry;
        try {
          entry = { status: 'loaded', place: await provider.getSummary(current) };
        } catch (e) {
          entry = { status: 'error', error: toPlacesError(e) };
          requested.current.delete(current); // bei erneutem Laden wieder versuchen
        }
        if (cancelled) {
          requested.current.delete(current);
          continue;
        }
        setResults((r) => ({ ...r, [current]: entry }));
      }
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    return () => {
      cancelled = true;
    };
  }, [idsKey, generation, provider]);

  /** Alles neu laden (z. B. Pull-to-Refresh). */
  const reload = useCallback(() => {
    requested.current.clear();
    setGeneration((g) => g + 1);
  }, []);

  const get = useCallback(
    (id: string): FavoritePlaceEntry => results[id] ?? { status: 'loading' },
    [results],
  );

  return { get, results, reload };
}
