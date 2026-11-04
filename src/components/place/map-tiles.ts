import { config } from '@/services/config';

/**
 * Kartenstil der Web-App.
 * Mit CARTO-Schlüssel: „Voyager“ (hell) bzw. „Dark Matter“ (dunkel) – ruhiger, passt besser zu iOS.
 * Ohne Schlüssel (CARTO verlangt seit 08/2026 einen): Standard-OSM-Kacheln, im Dunkelmodus per
 * CSS-Filter abgedunkelt (Klasse `tf-map-invert`, siehe scripts/build-web.mjs).
 */
export type MapTiles = {
  url: string;
  subdomains: string;
  attribution: string;
  maxZoom: number;
  /** CSS-Klasse für den Kartencontainer (Abdunkeln der OSM-Kacheln). */
  className: string | undefined;
};

const OSM_COPYRIGHT =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>';

export function mapTiles(dark: boolean, cartoKey: string | null = config.cartoApiKey): MapTiles {
  if (cartoKey) {
    const style = dark ? 'dark_all' : 'rastertiles/voyager';
    return {
      url: `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      subdomains: 'abcd',
      attribution: `${OSM_COPYRIGHT} © <a href="https://carto.com/attributions">CARTO</a>`,
      maxZoom: 20,
      className: undefined,
    };
  }
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: OSM_COPYRIGHT,
    maxZoom: 19,
    className: dark ? 'tf-map-invert' : undefined,
  };
}
