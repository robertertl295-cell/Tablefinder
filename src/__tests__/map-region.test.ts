import { distanceMeters } from '@/utils/geo';
import { radiusForRegion, regionDiffersFromSearch, regionForRadius } from '@/utils/map-region';

const CENTER = { latitude: 52.52, longitude: 13.405 };

describe('Kartenausschnitt', () => {
  it('regionForRadius und radiusForRegion passen zusammen', () => {
    const region = regionForRadius(CENTER, 1500);
    // Ausschnitt hat 15 % Rand, daher etwas größer als der Radius.
    expect(radiusForRegion(region)).toBeGreaterThanOrEqual(1500);
    expect(radiusForRegion(region)).toBeLessThan(1800);
  });

  it('begrenzt den Radius auf 300 m bis 10 km', () => {
    expect(radiusForRegion({ ...CENTER, latitudeDelta: 0.0001, longitudeDelta: 0.0001 })).toBe(300);
    expect(radiusForRegion({ ...CENTER, latitudeDelta: 5, longitudeDelta: 5 })).toBe(10_000);
  });

  it('erkennt nur deutliche Abweichungen', () => {
    const same = regionForRadius(CENTER, 1500);
    expect(regionDiffersFromSearch(same, CENTER, 1500)).toBe(false);

    const shifted = regionForRadius({ latitude: 52.53, longitude: 13.405 }, 1500);
    expect(distanceMeters(shifted, CENTER)).toBeGreaterThan(500);
    expect(regionDiffersFromSearch(shifted, CENTER, 1500)).toBe(true);

    const zoomedOut = regionForRadius(CENTER, 5000);
    expect(regionDiffersFromSearch(zoomedOut, CENTER, 1500)).toBe(true);
  });
});
