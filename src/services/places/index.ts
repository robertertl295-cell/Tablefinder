import { config, type AppConfig } from '@/services/config';
import { settingsStore, type SourcePreference } from '@/store/settings-store';
import type { DataSource } from '@/types/place';

import { CachedPlacesProvider } from './cached-provider';
import { GooglePlacesProvider } from './google-provider';
import { MockPlacesProvider } from './mock-provider';
import { OverpassPlacesProvider } from './overpass-provider';
import { RoutingPlacesProvider } from './routing-provider';

/**
 * Welche Quelle sucht: „Automatisch“ = Google mit API-Schlüssel, sonst OpenStreetMap.
 * Google ohne Schlüssel fällt ebenfalls auf OpenStreetMap zurück.
 */
export function resolveSource(preference: SourcePreference, hasGoogleKey: boolean): DataSource {
  if (preference === 'osm' || preference === 'mock') return preference;
  return hasGoogleKey ? 'google' : 'osm';
}

export function createPlacesProvider(
  appConfig: AppConfig,
  preference: () => SourcePreference,
): RoutingPlacesProvider {
  const google = appConfig.placesApiKey
    ? new CachedPlacesProvider(new GooglePlacesProvider({ apiKey: appConfig.placesApiKey }))
    : undefined;
  return new RoutingPlacesProvider(
    {
      google,
      osm: new CachedPlacesProvider(
        new OverpassPlacesProvider({ datasetUrl: appConfig.osmDatasetUrl }),
      ),
      mock: new CachedPlacesProvider(new MockPlacesProvider()),
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
