import { describeOpenState } from '@/utils/opening-hours';
import { parseOsmOpeningHours } from '@/utils/osm-opening-hours';

// 2. November 2026 ist ein Montag.
const at = (dayOffset: number, hour: number, minute = 0) =>
  new Date(2026, 10, 2 + dayOffset, hour, minute);
const MON = 0;
const TUE = 1;
const SAT = 5;
const SUN = 6;

describe('parseOsmOpeningHours', () => {
  it('Werktage und Samstag', () => {
    const r = parseOsmOpeningHours('Mo-Fr 08:00-18:00; Sa 10:00-14:00')!;
    expect(r.weekdayDescriptions).toEqual([
      'Montag: 08:00–18:00',
      'Dienstag: 08:00–18:00',
      'Mittwoch: 08:00–18:00',
      'Donnerstag: 08:00–18:00',
      'Freitag: 08:00–18:00',
      'Samstag: 10:00–14:00',
      'Sonntag: Geschlossen',
    ]);
    expect(describeOpenState(r.periods, at(TUE, 12))).toEqual({
      open: true,
      detail: 'Schließt um 18:00',
    });
    expect(describeOpenState(r.periods, at(SAT, 15))?.detail).toBe('Öffnet Mo um 08:00');
  });

  it('mehrere Zeitfenster und Tageslisten', () => {
    const r = parseOsmOpeningHours('Mo,We,Fr 12:00-15:00,18:00-23:00')!;
    expect(r.weekdayDescriptions[0]).toBe('Montag: 12:00–15:00, 18:00–23:00');
    expect(r.weekdayDescriptions[1]).toBe('Dienstag: Geschlossen');
    expect(describeOpenState(r.periods, at(MON, 16))?.detail).toBe('Öffnet um 18:00');
  });

  it('über Mitternacht und Bereich über das Wochenende', () => {
    const r = parseOsmOpeningHours('Sa-Mo 18:00-02:00')!;
    expect(r.weekdayDescriptions).toContain('Sonntag: 18:00–02:00');
    expect(r.weekdayDescriptions).toContain('Dienstag: Geschlossen');
    expect(describeOpenState(r.periods, at(SUN, 1))?.open).toBe(true); // Sa-Nacht
    expect(describeOpenState(r.periods, at(TUE, 1))?.open).toBe(true); // Mo-Nacht
    expect(describeOpenState(r.periods, at(TUE, 3))?.open).toBe(false);
  });

  it('spätere Regeln überschreiben frühere', () => {
    const r = parseOsmOpeningHours('Mo-Su 10:00-22:00; Mo off')!;
    expect(r.weekdayDescriptions[0]).toBe('Montag: Geschlossen');
    expect(r.weekdayDescriptions[6]).toBe('Sonntag: 10:00–22:00');
  });

  it('Feiertagsregeln werden übersprungen', () => {
    const r = parseOsmOpeningHours('Mo-Fr 09:00-17:00; PH off')!;
    expect(r.weekdayDescriptions[0]).toBe('Montag: 09:00–17:00');
  });

  it('24/7 und 24:00 als Ende', () => {
    expect(describeOpenState(parseOsmOpeningHours('24/7')!.periods, at(MON, 3))).toEqual({
      open: true,
      detail: 'Durchgehend geöffnet',
    });
    const late = parseOsmOpeningHours('Fr 18:00-24:00')!;
    expect(late.weekdayDescriptions[4]).toBe('Freitag: 18:00–24:00');
    expect(describeOpenState(late.periods, at(4, 23, 30))?.detail).toBe('Schließt morgen um 00:00');
  });

  it('Uhrzeiten ohne Tagesangabe gelten täglich', () => {
    const r = parseOsmOpeningHours('11:00-23:00')!;
    expect(r.weekdayDescriptions.every((l) => l.endsWith('11:00–23:00'))).toBe(true);
  });

  it.each([
    '',
    'Mo-Fr 08:00-18:00; Dec 24 off',
    'Mo-Fr sunrise-sunset',
    'Mo-Fr 08:00+',
    '"nach Vereinbarung"',
    'Mo-Fr 08:00-12:00 || "auf Anfrage"',
    'week 1-26 Mo-Fr 08:00-18:00',
    'Mo-Fr',
    'Mo-Fr 8 Uhr bis 18 Uhr',
    'Mo-Fr 25:00-26:00',
  ])('unbekannt statt geraten: %p', (value) => {
    expect(parseOsmOpeningHours(value)).toBeNull();
  });
});
