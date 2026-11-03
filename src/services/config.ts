import type { DataSource } from '@/types/place';

/**
 * Zentrale Laufzeitkonfiguration.
 * EXPO_PUBLIC_*-Variablen werden beim Bundling eingesetzt und sind im App-Paket sichtbar.
 * Den Places-Key daher in der Google Cloud Console auf die Bundle-ID beschränken.
 */

/** Berlin-Mitte (Alexanderplatz) – Standard, wenn keine Standortfreigabe vorliegt. */
export const DEFAULT_LOCATION = { latitude: 52.5219, longitude: 13.4132 } as const;

export const DEFAULT_RADIUS_METERS = 1500;

export type AppConfig = {
  placesApiKey: string | null;
  dataSource: DataSource;
};

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const key = env.EXPO_PUBLIC_PLACES_API_KEY?.trim();
  const placesApiKey = key ? key : null;
  return {
    placesApiKey,
    dataSource: placesApiKey ? 'google' : 'mock',
  };
}

export const config: AppConfig = readConfig({
  // Expo ersetzt nur direkte Zugriffe auf process.env.EXPO_PUBLIC_* statisch.
  EXPO_PUBLIC_PLACES_API_KEY: process.env.EXPO_PUBLIC_PLACES_API_KEY,
});
