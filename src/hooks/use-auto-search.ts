import { useEffect } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { searchCenter, searchRadius, searchStore, useSearch } from '@/store/search-store';

export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Fragt beim Start den Standort an und sucht danach automatisch neu,
 * sobald sich Suchtext (verzögert), Ort oder Radius ändern.
 * Einmal weit oben im Baum einbinden (Tab-Layout).
 */
export function useAutoSearch() {
  const text = useSearch((s) => s.text.trim());
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const centerKey = useSearch((s) => {
    const c = searchCenter(s);
    return `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`;
  });
  const radius = useSearch(searchRadius);
  const locationSettled = useSearch(
    (s) => s.locationStatus !== 'unknown' && s.locationStatus !== 'requesting',
  );

  useEffect(() => {
    void searchStore.getState().locate();
  }, []);

  useEffect(() => {
    // Erst suchen, wenn feststeht, ob es einen Standort gibt – spart eine unnötige Anfrage.
    if (locationSettled) void searchStore.getState().search();
  }, [debouncedText, centerKey, radius, locationSettled]);
}
