import { mapTiles } from '@/components/place/map-tiles';

describe('mapTiles', () => {
  test('ohne Schlüssel: OSM-Standardkarte, dunkel per CSS-Filter', () => {
    expect(mapTiles(false, null).url).toContain('tile.openstreetmap.org');
    expect(mapTiles(false, null).className).toBeUndefined();
    expect(mapTiles(true, null).className).toBe('tf-map-invert');
  });

  test('mit Schlüssel: CARTO Voyager bzw. Dark Matter mit key-Parameter', () => {
    const light = mapTiles(false, 'k 1');
    expect(light.url).toContain('basemaps.cartocdn.com/rastertiles/voyager/');
    expect(light.url).toMatch(/\?key=k%201$/);
    expect(light.attribution).toContain('CARTO');
    expect(mapTiles(true, 'k').url).toContain('/dark_all/');
    expect(mapTiles(true, 'k').className).toBeUndefined();
  });
});
