import type { OpeningPeriod } from '@/types/place';
import {
  describeOpenState,
  splitWeekdayDescription,
  weekdayIndexMondayFirst,
} from '@/utils/opening-hours';

// 2. November 2026 ist ein Montag.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, 1 + day, hour, minute);
const MON = 1;
const TUE = 2;
const SAT = 6;
const SUN = 0;

const period = (openDay: number, open: string, closeDay: number, close: string): OpeningPeriod => {
  const [oh, om] = open.split(':').map(Number) as [number, number];
  const [ch, cm] = close.split(':').map(Number) as [number, number];
  return {
    open: { day: openDay, hour: oh, minute: om },
    close: { day: closeDay, hour: ch, minute: cm },
  };
};

/** Di–So 12:00–22:30 */
const LUNCH_DINNER = [0, 2, 3, 4, 5, 6].map((d) => period(d, '12:00', d, '22:30'));
/** Täglich 19:00–03:00 */
const NIGHT = [0, 1, 2, 3, 4, 5, 6].map((d) => period(d, '19:00', (d + 1) % 7, '03:00'));

describe('weekdayIndexMondayFirst', () => {
  it('beginnt mit Montag', () => {
    expect(weekdayIndexMondayFirst(at(MON, 12))).toBe(0);
    expect(weekdayIndexMondayFirst(at(SUN + 7, 12))).toBe(6);
  });
});

describe('describeOpenState', () => {
  it('geöffnet: nennt die Schließzeit', () => {
    expect(describeOpenState(LUNCH_DINNER, at(TUE, 13))).toEqual({
      open: true,
      detail: 'Schließt um 22:30',
    });
  });

  it('vor Öffnung: öffnet heute', () => {
    expect(describeOpenState(LUNCH_DINNER, at(TUE, 9, 30))).toEqual({
      open: false,
      detail: 'Öffnet um 12:00',
    });
  });

  it('nach Schluss: öffnet morgen', () => {
    expect(describeOpenState(LUNCH_DINNER, at(TUE, 23))).toEqual({
      open: false,
      detail: 'Öffnet morgen um 12:00',
    });
  });

  it('Ruhetag: nennt den nächsten Öffnungstag', () => {
    // Sonntag 23:00 → Montag Ruhetag → Dienstag 12:00
    expect(describeOpenState(LUNCH_DINNER, at(SUN + 7, 23))?.detail).toBe('Öffnet Di um 12:00');
  });

  it('über Mitternacht: kurz nach 0 Uhr noch geöffnet', () => {
    expect(describeOpenState(NIGHT, at(TUE, 1))).toEqual({
      open: true,
      detail: 'Schließt um 03:00',
    });
    expect(describeOpenState(NIGHT, at(TUE, 20))).toEqual({
      open: true,
      detail: 'Schließt morgen um 03:00',
    });
  });

  it('über das Wochenende: Samstagnacht bis Sonntag früh', () => {
    const satNight = [period(SAT, '22:00', SUN, '04:00')];
    expect(describeOpenState(satNight, at(SUN + 7, 2))?.open).toBe(true);
    expect(describeOpenState(satNight, at(SAT, 23))?.detail).toBe('Schließt morgen um 04:00');
  });

  it('durchgehend geöffnet (Zeitraum ohne Ende)', () => {
    expect(
      describeOpenState([{ open: { day: 0, hour: 0, minute: 0 }, close: null }], at(MON, 3)),
    ).toEqual({ open: true, detail: 'Durchgehend geöffnet' });
  });

  it('ohne Zeiträume: keine Aussage', () => {
    expect(describeOpenState([], at(MON, 12))).toBeNull();
  });
});

describe('splitWeekdayDescription', () => {
  it('trennt Tag und Zeiten', () => {
    expect(splitWeekdayDescription('Montag: 12:00–14:30, 18:00–22:00')).toEqual({
      day: 'Montag',
      hours: '12:00–14:30, 18:00–22:00',
    });
    expect(splitWeekdayDescription('Sonntag: Geschlossen').hours).toBe('Geschlossen');
  });
});
