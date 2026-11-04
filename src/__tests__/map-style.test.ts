import { FALLBACK_TILES, mapStyleUrl } from '@/components/place/map-style';

describe('mapStyleUrl', () => {
  test('hell: OpenFreeMap Positron, dunkel: OpenFreeMap Dark', () => {
    expect(mapStyleUrl(false)).toBe('https://tiles.openfreemap.org/styles/positron');
    expect(mapStyleUrl(true)).toBe('https://tiles.openfreemap.org/styles/dark');
  });

  test('Rückfall nutzt OSM-Kacheln mit Quellenangabe', () => {
    expect(FALLBACK_TILES.url).toContain('tile.openstreetmap.org');
    expect(FALLBACK_TILES.attribution).toContain('OpenStreetMap');
  });
});
