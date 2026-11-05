import { config, type AppConfig } from '@/services/config';
import { settingsStore, type SourcePreference } from '@/store/settings-store';
import type { SearchSource } from '@/types/place';

import { CachedPlacesProvider } from './cached-provider';
import { CombinedPlacesProvider } from './combined-provider';
import { GooglePlacesProvider } from './google-provider';
import { MockPlacesProvider } from './mock-provider';
import { OverpassPlacesProvider } from './overpass-provider';
import { RoutingPlacesProvider } from './routing-provider';

/**
 * Welche Quelle sucht: „Automatisch“ = Google + OpenStreetMap kombiniert, wenn ein
 * API-Schlüssel da ist, sonst OpenStreetMap. Google ohne Schlüssel fällt ebenfalls auf OSM zurück.
 */
export function resolveSource(preference: SourcePreference, hasGoogleKey: boolean): SearchSource {
  if (preference === 'osm' || preference === 'mock') return preference;
  if (!hasGoogleKey) return 'osm';
  return preference === 'google' ? 'google' : 'combined';
}

export function createPlacesProvider(
  appConfig: AppConfig,
  preference: () => SourcePreference,
): RoutingPlacesProvider {
  const google = appConfig.placesApiKey
    ? new CachedPlacesProvider(new GooglePlacesProvider({ apiKey: appConfig.placesApiKey }))
    : undefined;
  const osm = new CachedPlacesProvider(
    new OverpassPlacesProvider({ datasetUrl: appConfig.osmDatasetUrl }),
  );
  return new RoutingPlacesProvider(
    {
      google,
      osm,
      mock: new CachedPlacesProvider(new MockPlacesProvider()),
      combined: google
        ? new CachedPlacesProvider(new CombinedPlacesProvider(google, osm))
        : undefined,
    },
    () => resolveSource(preference(), google !== undefined),
  );
}

/** App-weite Instanz; die Suchquelle folgt der Einstellung „Datenquelle“. */
export const placesProvider = createPlacesProvider(
  config,
  () => settingsStore.getState().dataSource,
);

export { CachedPlacesProvider } from './cached-provider';
export { SOURCE_CAPABILITIES, SOURCE_LABEL } from './capabilities';
export type { SourceCapabilities } from './capabilities';
export { PLACES_ERROR_MESSAGE, PlacesError, isPlacesError, toPlacesError } from './errors';
export type { PlacesErrorKind } from './errors';
export { CATEGORY_LABEL } from './place-types';
export type { PlacesProvider, SearchQuery, SearchResult } from './provider';
