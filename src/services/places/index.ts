import { config, type AppConfig } from '@/services/config';

import { CachedPlacesProvider } from './cached-provider';
import { GooglePlacesProvider } from './google-provider';
import { MockPlacesProvider } from './mock-provider';

export function createPlacesProvider(appConfig: AppConfig): CachedPlacesProvider {
  const inner = appConfig.placesApiKey
    ? new GooglePlacesProvider({ apiKey: appConfig.placesApiKey })
    : new MockPlacesProvider();
  return new CachedPlacesProvider(inner);
}

/** App-weite Instanz; Google bei gesetztem Key, sonst Mock-Daten. */
export const placesProvider = createPlacesProvider(config);

export { CachedPlacesProvider } from './cached-provider';
export { PLACES_ERROR_MESSAGE, PlacesError, isPlacesError, toPlacesError } from './errors';
export type { PlacesErrorKind } from './errors';
export { CATEGORY_LABEL } from './place-types';
export type { PlacesProvider, SearchQuery, SearchResult } from './provider';
