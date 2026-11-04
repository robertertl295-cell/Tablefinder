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
  /** Ordner mit den KI-Symbolbildern (public/placeholders); `null` = keine Symbolbilder. */
  placeholderBaseUrl: string | null;
  /**
   * Schlüssel für die Google-Karte in der Web-App (Maps JavaScript API).
   * Standard: derselbe Key wie für Places. `null` = Karte von OpenFreeMap.
   */
  googleMapsKey: string | null;
  /** Map-ID für Google-Karten (Marker, Dunkelmodus); ohne eigene ID die Demo-ID von Google. */
  googleMapId: string;
};

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const key = env.EXPO_PUBLIC_PLACES_API_KEY?.trim();
  const dataset = env.EXPO_PUBLIC_OSM_DATASET_URL?.trim();
  const placeholders = env.EXPO_PUBLIC_PLACEHOLDER_BASE_URL?.trim();
  const mapsKey = env.EXPO_PUBLIC_GOOGLE_MAPS_KEY?.trim() || key;
  const mapId = env.EXPO_PUBLIC_GOOGLE_MAP_ID?.trim();
  return {
    placesApiKey: key ? key : null,
    osmDatasetUrl: dataset ? dataset : null,
    placeholderBaseUrl: placeholders ? placeholders : null,
    googleMapsKey: mapsKey ? mapsKey : null,
    googleMapId: mapId ? mapId : 'DEMO_MAP_ID',
  };
}

export const config: AppConfig = readConfig({
  // Expo ersetzt nur direkte Zugriffe auf process.env.EXPO_PUBLIC_* statisch.
  EXPO_PUBLIC_PLACES_API_KEY: process.env.EXPO_PUBLIC_PLACES_API_KEY,
  EXPO_PUBLIC_OSM_DATASET_URL: process.env.EXPO_PUBLIC_OSM_DATASET_URL,
  EXPO_PUBLIC_PLACEHOLDER_BASE_URL: process.env.EXPO_PUBLIC_PLACEHOLDER_BASE_URL,
  EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
  EXPO_PUBLIC_GOOGLE_MAP_ID: process.env.EXPO_PUBLIC_GOOGLE_MAP_ID,
});
