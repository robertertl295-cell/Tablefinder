import { boundingBox, distanceMeters } from '@/utils/geo';

const ALEX = { latitude: 52.5219, longitude: 13.4132 };
const BRANDENBURGER_TOR = { latitude: 52.5163, longitude: 13.3777 };

describe('distanceMeters', () => {
  it('ist 0 für denselben Punkt', () => {
    expect(distanceMeters(ALEX, ALEX)).toBe(0);
  });

  it('berechnet Alexanderplatz → Brandenburger Tor (~2,5 km)', () => {
    expect(distanceMeters(ALEX, BRANDENBURGER_TOR)).toBeGreaterThan(2400);
    expect(distanceMeters(ALEX, BRANDENBURGER_TOR)).toBeLessThan(2600);
  });
});

describe('boundingBox', () => {
  it('umschließt den Kreis: Kanten liegen genau im Radius', () => {
    const box = boundingBox(ALEX, 1000);
    const north = { latitude: box.high.latitude, longitude: ALEX.longitude };
    const east = { latitude: ALEX.latitude, longitude: box.high.longitude };
    expect(distanceMeters(ALEX, north)).toBeCloseTo(1000, -1);
    expect(distanceMeters(ALEX, east)).toBeCloseTo(1000, -1);
    expect(box.low.latitude).toBeLessThan(ALEX.latitude);
    expect(box.low.longitude).toBeLessThan(ALEX.longitude);
  });
});
