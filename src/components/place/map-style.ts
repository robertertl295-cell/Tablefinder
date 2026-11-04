/**
 * Kartenstil der Web-App: Vektorkarten von OpenFreeMap (kein Konto, kein Schlüssel, kein Limit).
 * „Positron“ (hell) und „Dark“ (dunkel) sind ruhig und bleiben beim Zoomen scharf.
 * Gezeichnet mit MapLibre GL innerhalb von Leaflet (siehe base-map.web.tsx).
 */
export const OPENFREEMAP_STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export function mapStyleUrl(dark: boolean): string {
  return dark ? OPENFREEMAP_STYLE.dark : OPENFREEMAP_STYLE.light;
}

/**
 * Rückfall ohne WebGL: Standard-OSM-Kacheln, im Dunkelmodus per CSS-Filter abgedunkelt
 * (Klasse `tf-map-invert`, siehe scripts/build-web.mjs).
 */
export const FALLBACK_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>',
  maxZoom: 19,
} as const;

/** Prüft, ob der Browser WebGL kann (sonst Rückfall auf Rasterkacheln). */
export function supportsWebGL(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
