/**
 * Kartenstil der Web-App: CARTO-Basiskarten auf OpenStreetMap-Daten.
 * „Voyager“ (hell) und „Dark Matter“ (dunkel) wirken ruhiger als die Standard-OSM-Kacheln
 * und passen besser zum iOS-Look. `{r}` liefert auf Retina-Bildschirmen scharfe Kacheln (@2x).
 */
export const MAP_TILE_SUBDOMAINS = 'abcd';
export const MAP_MAX_ZOOM = 20;

export const MAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a> © <a href="https://carto.com/attributions">CARTO</a>';

export function mapTilesUrl(dark: boolean): string {
  const style = dark ? 'dark_all' : 'rastertiles/voyager';
  return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
}
