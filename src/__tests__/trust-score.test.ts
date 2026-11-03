import { MOCK_PLACES } from '@/services/places/mock-data';
import type { PlaceSummary } from '@/types/place';
import { sortPlaces } from '@/utils/sort-places';
import {
  TRUST_PRIOR_MEAN,
  trustAdjustment,
  trustExplanation,
  trustScore,
} from '@/utils/trust-score';

describe('trustScore', () => {
  it('liefert null ohne Bewertungen', () => {
    expect(trustScore(null, 0)).toBeNull();
    expect(trustScore(4.5, 0)).toBeNull();
    expect(trustScore(Number.NaN, 10)).toBeNull();
    expect(trustScore(4.5, Number.NaN)).toBeNull();
    expect(trustScore(4.5, undefined as unknown as number)).toBeNull();
  });

  it('zieht wenige Bewertungen deutlich Richtung Durchschnitt', () => {
    // 5,0 aus 3 Bewertungen → klar unter 5
    expect(trustScore(5, 3)).toBeCloseTo((25 * 4.3 + 3 * 5) / 28, 5);
    expect(trustScore(5, 3)!).toBeLessThan(4.4);
  });

  it('lässt viele Bewertungen fast unverändert', () => {
    expect(trustScore(4.6, 1284)!).toBeCloseTo(4.594, 2);
  });

  it('hebt wenige schwache Bewertungen an', () => {
    expect(trustScore(2, 4)!).toBeGreaterThan(3.9);
  });

  it('bleibt immer zwischen Schnitt und Durchschnitt', () => {
    for (const [r, n] of [
      [4.9, 12],
      [3.1, 50],
      [4.3, 7],
      [1, 1000],
    ] as const) {
      const s = trustScore(r, n)!;
      expect(s).toBeGreaterThanOrEqual(Math.min(r, TRUST_PRIOR_MEAN) - 1e-9);
      expect(s).toBeLessThanOrEqual(Math.max(r, TRUST_PRIOR_MEAN) + 1e-9);
    }
  });

  it('dreht die Reihenfolge: 4,6 aus 1.284 vor 4,8 aus 22', () => {
    expect(trustScore(4.6, 1284)!).toBeGreaterThan(trustScore(4.8, 22)!);
    // ab genug Bewertungen gewinnt der höhere Schnitt wieder
    expect(trustScore(4.8, 2000)!).toBeGreaterThan(trustScore(4.6, 1284)!);
  });
});

describe('Erklärung', () => {
  it('beschreibt die Richtung der Korrektur', () => {
    expect(trustAdjustment(4.6, trustScore(4.6, 1284)!)).toBe('none');
    expect(trustAdjustment(4.9, trustScore(4.9, 12)!)).toBe('down');
    expect(trustAdjustment(3, trustScore(3, 5)!)).toBe('up');
    expect(trustExplanation(4.9, 12, trustScore(4.9, 12)!)).toContain('Wenige sehr gute');
    expect(trustExplanation(4.6, 1284, trustScore(4.6, 1284)!)).toContain('belastbar');
  });
});

describe('sortPlaces', () => {
  const place = (id: string): PlaceSummary => MOCK_PLACES.find((p) => p.id === id)!;
  const RAMEN = place('mock-ramen-kreuzberg'); // 4,6 / 1284
  const VEGAN = place('mock-vegan-kreuzberg'); // 4,8 / 22
  const NEW = place('mock-new-wedding'); // keine Bewertungen
  const FINE = place('mock-fine-mitte'); // 4,9 / 12
  const input = [NEW, FINE, VEGAN, RAMEN];
  const ids = (list: PlaceSummary[]) => list.map((p) => p.id);

  it('Relevanz behält die Reihenfolge (als Kopie)', () => {
    const out = sortPlaces(input, 'relevance', null);
    expect(ids(out)).toEqual(ids(input));
    expect(out).not.toBe(input);
  });

  it('Vertrauensscore: belastbare Bewertung zuerst, ohne Bewertung ans Ende', () => {
    expect(ids(sortPlaces(input, 'trust', null))).toEqual([RAMEN.id, VEGAN.id, FINE.id, NEW.id]);
  });

  it('Entfernung braucht einen Standort, sonst Relevanz', () => {
    const kreuzberg = { latitude: 52.4985, longitude: 13.4302 };
    expect(ids(sortPlaces(input, 'distance', kreuzberg))[0]).toBe(VEGAN.id);
    expect(ids(sortPlaces(input, 'distance', null))).toEqual(ids(input));
  });
});
