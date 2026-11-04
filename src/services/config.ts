/**
 * Zentrale Laufzeitkonfiguration.
 * EXPO_PUBLIC_*-Variablen werden beim Bundling eingesetzt und sind im App-Paket sichtbar.
 * Den Places-Key daher in der Google Cloud Console auf die Bundle-ID beschränken.
 */

/** Berlin-Mitte (Alexanderplatz) – Standard, wenn keine Standortfreigabe vorliegt. */
export const DEFAULT_LOCATION = { latitude: 52.5219, longitude: 13.4132 } as const;

export const DEFAULT_RADIUS_METERS = 1500;

export type AppConfig = {
  /** Google-Places-Schlüssel; `null` = nicht gesetzt (dann sucht „Automatisch“ mit OpenStreetMap). */
  placesApiKey: string | null;
  /** Täglicher OSM-Datensatz für Berlin; `null` = live bei Overpass fragen. */
  osmDatasetUrl: string | null;
  /** CARTO-Basiskarten-Schlüssel (kostenlos, carto.com/basemaps/apikey); `null` = OSM-Standardkarte. */
  cartoApiKey: string | null;
};

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const key = env.EXPO_PUBLIC_PLACES_API_KEY?.trim();
  const dataset = env.EXPO_PUBLIC_OSM_DATASET_URL?.trim();
  const carto = env.EXPO_PUBLIC_CARTO_API_KEY?.trim();
  return {
    placesApiKey: key ? key : null,
    osmDatasetUrl: dataset ? dataset : null,
    cartoApiKey: carto ? carto : null,
  };
}

export const config: AppConfig = readConfig({
  // Expo ersetzt nur direkte Zugriffe auf process.env.EXPO_PUBLIC_* statisch.
  EXPO_PUBLIC_PLACES_API_KEY: process.env.EXPO_PUBLIC_PLACES_API_KEY,
  EXPO_PUBLIC_OSM_DATASET_URL: process.env.EXPO_PUBLIC_OSM_DATASET_URL,
  EXPO_PUBLIC_CARTO_API_KEY: process.env.EXPO_PUBLIC_CARTO_API_KEY,
});
