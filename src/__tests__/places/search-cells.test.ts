import { offset, searchCells } from '@/services/places/search-cells';
import { distanceMeters } from '@/utils/geo';

const CENTER = { latitude: 52.5, longitude: 13.42 };

describe('searchCells', () => {
  it('ganzer Kreis, Mitte und 6 Ringkreise', () => {
    const cells = searchCells(CENTER, 1500);
    expect(cells).toHaveLength(8);
    expect(cells[0]).toEqual({ center: CENTER, radiusMeters: 1500 });
    expect(cells[1]).toEqual({ center: CENTER, radiusMeters: 825 });
    for (const c of cells.slice(2)) {
      expect(distanceMeters(CENTER, c.center)).toBeCloseTo(1125, -1);
    }
  });

  it('kleine Kreise ohne Teilkreise', () => {
    expect(searchCells(CENTER, 500)).toHaveLength(1);
  });

  it('die Teilkreise decken den ganzen Suchkreis lückenlos ab', () => {
    for (const radius of [600, 1500, 5000]) {
      const cells = searchCells(CENTER, radius).slice(1);
      for (let r = 0; r <= radius; r += radius / 20) {
        for (let deg = 0; deg < 360; deg += 5) {
          const p = offset(CENTER, r, deg);
          const covered = cells.some((c) => distanceMeters(p, c.center) <= c.radiusMeters + 1);
          if (!covered) throw new Error(`Lücke bei ${radius} m: r=${r}, ${deg}°`);
        }
      }
    }
  });
});
