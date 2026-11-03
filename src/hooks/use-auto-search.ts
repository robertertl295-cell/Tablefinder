import { useEffect } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFilters } from '@/store/filter-store';
import { searchCenter, searchStore, useSearch } from '@/store/search-store';
import { filtersKey } from '@/utils/filters';

export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Fragt beim Start den Standort an und sucht danach automatisch neu,
 * sobald sich Suchtext (verzögert), Ort oder Filter ändern.
 * Einmal weit oben im Baum einbinden (Tab-Layout).
 */
export function useAutoSearch() {
  const text = useSearch((s) => s.text.trim());
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const centerKey = useSearch((s) => {
    const c = searchCenter(s);
    return `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`;
  });
  const selectionKey = useSearch((s) =>
    s.selection.mode === 'area' ? `area:${s.selection.radiusMeters}` : s.selection.mode,
  );
  const filterKey = useFilters((s) => filtersKey(s.filters));
  const filtersReady = useFilters((s) => s.hydrated);
  const locationSettled = useSearch(
    (s) => s.locationStatus !== 'unknown' && s.locationStatus !== 'requesting',
  );

  useEffect(() => {
    void searchStore.getState().locate();
  }, []);

  useEffect(() => {
    // Erst suchen, wenn Standort und gespeicherte Filter feststehen – spart unnötige Anfragen.
    if (locationSettled && filtersReady) void searchStore.getState().search();
  }, [debouncedText, centerKey, selectionKey, filterKey, locationSettled, filtersReady]);
}
