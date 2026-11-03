import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { findDistrict } from '@/constants/districts';
import { DEFAULT_LOCATION } from '@/services/config';
import { requestCurrentLocation, type LocationResult } from '@/services/location';
import { placesProvider } from '@/services/places';
import { PlacesError, toPlacesError } from '@/services/places/errors';
import type { PlacesProvider, SearchQuery, SearchResult } from '@/services/places/provider';
import { filterStore, useFilters } from '@/store/filter-store';
import type { Filters } from '@/types/filters';
import type { LatLng, PlaceSummary } from '@/types/place';
import { SOURCE_CAPABILITIES } from '@/services/places/capabilities';
import {
  createDefaultFilters,
  effectiveFilters,
  filtersToQuery,
  matchesFilters,
} from '@/utils/filters';

export type LocationSelection =
  | { mode: 'current' }
  | { mode: 'district'; districtId: string }
  /** Ausschnitt, den der Nutzer auf der Karte gewählt hat („In diesem Bereich suchen“). */
  | { mode: 'area'; center: LatLng; radiusMeters: number };

export type LocationStatus = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export type ViewMode = 'list' | 'map';

export type SearchState = {
  text: string;
  selection: LocationSelection;
  userLocation: LatLng | null;
  locationStatus: LocationStatus;
  viewMode: ViewMode;

  results: PlaceSummary[];
  nextPageToken: string | null;
  status: SearchStatus;
  error: PlacesError | null;
  isLoadingMore: boolean;
  isRefreshing: boolean;

  setText: (text: string) => void;
  selectCurrentLocation: () => void;
  selectDistrict: (districtId: string) => void;
  selectArea: (center: LatLng, radiusMeters: number) => void;
  setViewMode: (mode: ViewMode) => void;
  /** Standort anfragen; ändert die Auswahl nicht. */
  locate: () => Promise<void>;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

/** Mittelpunkt der Suche je nach Auswahl. Ohne Standort: Berlin-Mitte. */
export function searchCenter(s: Pick<SearchState, 'selection' | 'userLocation'>): LatLng {
  switch (s.selection.mode) {
    case 'district':
      return findDistrict(s.selection.districtId)?.center ?? DEFAULT_LOCATION;
    case 'area':
      return s.selection.center;
    case 'current':
      return s.userLocation ?? DEFAULT_LOCATION;
  }
}

/** Im Kartenausschnitt gilt dessen Radius, sonst der aus den Filtern. */
export function searchRadius(selection: LocationSelection, filterRadius: number): number {
  return selection.mode === 'area' ? selection.radiusMeters : filterRadius;
}

/** Kurzer Text für die aktuelle Standortwahl. */
export function locationLabel(
  s: Pick<SearchState, 'selection' | 'userLocation' | 'locationStatus'>,
): string {
  switch (s.selection.mode) {
    case 'district':
      return findDistrict(s.selection.districtId)?.name ?? 'Berlin';
    case 'area':
      return 'Kartenausschnitt';
    case 'current':
      if (s.userLocation) return 'In deiner Nähe';
      return s.locationStatus === 'requesting' || s.locationStatus === 'unknown'
        ? 'Standort wird ermittelt …'
        : 'Berlin-Mitte';
  }
}

export type SearchStoreDeps = {
  provider: PlacesProvider & { clear?: () => void };
  locate: () => Promise<LocationResult>;
  getFilters?: () => Filters;
  /** Nach dem Filtern mindestens so viele Treffer anstreben (Standard 8) … */
  minResults?: number;
};

const MIN_FILTERED_RESULTS = 8;
/** … aber höchstens so viele Seiten pro Aktion laden (Kostenbremse). */
const MAX_PAGES_PER_FETCH = 3;

export function createSearchStore(deps: SearchStoreDeps): StoreApi<SearchState> {
  // Laufende Nummer, damit verspätete Antworten älterer Suchen ignoriert werden.
  let requestSeq = 0;
  const getFilters = deps.getFilters ?? (() => createDefaultFilters());
  const minResults = deps.minResults ?? MIN_FILTERED_RESULTS;

  return createStore<SearchState>()((set, get) => {
    const buildQuery = (filters: Filters, pageToken?: string): SearchQuery => {
      const s = get();
      return {
        ...filtersToQuery(filters),
        text: s.text.trim() || undefined,
        center: searchCenter(s),
        radiusMeters: searchRadius(s.selection, filters.radiusMeters),
        pageToken,
      };
    };

    /**
     * Lädt Seiten und filtert clientseitig (Merkmale, Mindestanzahl Bewertungen …),
     * bis genug Treffer da sind oder die Seitenbremse greift.
     */
    const fetchFiltered = async (
      pageToken: string | undefined,
      minResults: number,
    ): Promise<SearchResult> => {
      // Nur Filter anwenden, die die aktive Quelle auswerten kann.
      const filters = effectiveFilters(getFilters(), SOURCE_CAPABILITIES[deps.provider.source]);
      const places: PlaceSummary[] = [];
      let token = pageToken;
      for (let page = 0; page < MAX_PAGES_PER_FETCH; page++) {
        const result = await deps.provider.search(buildQuery(filters, token));
        places.push(...result.places.filter((p) => matchesFilters(p, filters)));
        token = result.nextPageToken ?? undefined;
        if (!token || places.length >= minResults) break;
      }
      return { places, nextPageToken: token ?? null };
    };

    return {
      text: '',
      selection: { mode: 'current' },
      userLocation: null,
      locationStatus: 'unknown',
      viewMode: 'list',

      results: [],
      nextPageToken: null,
      status: 'idle',
      error: null,
      isLoadingMore: false,
      isRefreshing: false,

      setText: (text) => set({ text }),
      selectCurrentLocation: () => {
        set({ selection: { mode: 'current' } });
        // Erneut fragen, falls der Standort bisher fehlte (z. B. Freigabe nachträglich erteilt).
        if (!get().userLocation) void get().locate();
      },
      selectDistrict: (districtId) => set({ selection: { mode: 'district', districtId } }),
      selectArea: (center, radiusMeters) =>
        set({ selection: { mode: 'area', center, radiusMeters } }),
      setViewMode: (viewMode) => set({ viewMode }),

      locate: async () => {
        set({ locationStatus: 'requesting' });
        const result = await deps.locate();
        if (result.status === 'granted') {
          set({ locationStatus: 'granted', userLocation: result.coords });
        } else {
          set({ locationStatus: result.status });
        }
      },

      search: async () => {
        const seq = ++requestSeq;
        set({ status: 'loading', error: null, isLoadingMore: false });
        try {
          const result = await fetchFiltered(undefined, minResults);
          if (seq !== requestSeq) return;
          set({ results: result.places, nextPageToken: result.nextPageToken, status: 'success' });
        } catch (e) {
          if (seq !== requestSeq) return;
          set({ status: 'error', error: toPlacesError(e), results: [], nextPageToken: null });
        }
      },

      loadMore: async () => {
        const { nextPageToken, isLoadingMore, status } = get();
        if (!nextPageToken || isLoadingMore || status !== 'success') return;
        const seq = requestSeq;
        set({ isLoadingMore: true });
        try {
          // Mindestens einen neuen Treffer holen, sonst feuert onEndReached nicht erneut.
          const result = await fetchFiltered(nextPageToken, 1);
          if (seq !== requestSeq) return;
          const known = new Set(get().results.map((p) => p.id));
          set({
            results: [...get().results, ...result.places.filter((p) => !known.has(p.id))],
            nextPageToken: result.nextPageToken,
            isLoadingMore: false,
          });
        } catch {
          // Fehler beim Nachladen: bisherige Treffer behalten, später erneut versuchen.
          if (seq === requestSeq) set({ isLoadingMore: false });
        }
      },

      refresh: async () => {
        deps.provider.clear?.();
        set({ isRefreshing: true });
        await get().search();
        set({ isRefreshing: false });
      },
    };
  });
}

export const searchStore = createSearchStore({
  provider: placesProvider,
  locate: () => requestCurrentLocation(),
  getFilters: () => filterStore.getState().filters,
});

/** React-Hook für den Such-Store. Immer einzelne Werte auswählen, keine neuen Objekte. */
export function useSearch<T>(selector: (state: SearchState) => T): T {
  return useStore(searchStore, selector);
}

/** Wirksamer Suchradius (Kartenausschnitt oder Filter). */
export function useSearchRadius(): number {
  const selection = useSearch((s) => s.selection);
  const filterRadius = useFilters((s) => s.filters.radiusMeters);
  return searchRadius(selection, filterRadius);
}
