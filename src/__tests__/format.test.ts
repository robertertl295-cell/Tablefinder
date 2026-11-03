import {
  formatCount,
  formatDistance,
  formatPriceLevel,
  formatRating,
  spokenDistance,
} from '@/utils/format';

describe('Formatierung', () => {
  it('Bewertung mit Komma', () => {
    expect(formatRating(4.6)).toBe('4,6');
    expect(formatRating(4)).toBe('4,0');
  });

  it('Anzahl mit Tausenderpunkt', () => {
    expect(formatCount(12)).toBe('12');
    expect(formatCount(1284)).toBe('1.284');
    expect(formatCount(1234567)).toBe('1.234.567');
  });

  it.each([
    [3, '10 m'],
    [644, '640 m'],
    [999, '1000 m'],
    [1234, '1,2 km'],
    [9_949, '9,9 km'],
    [12_400, '12 km'],
  ])('Entfernung %i m → %s', (m, expected) => {
    expect(formatDistance(m)).toBe(expected);
  });

  it('Entfernung für Screenreader ausgeschrieben', () => {
    expect(spokenDistance(1234)).toBe('1,2 Kilometer');
    expect(spokenDistance(640)).toBe('640 Meter');
  });

  it('Preisniveau als Eurozeichen', () => {
    expect(formatPriceLevel(1)).toBe('€');
    expect(formatPriceLevel(4)).toBe('€€€€');
  });
});
