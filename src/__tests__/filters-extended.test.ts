import { MOCK_PLACES } from '@/services/places/mock-data';
import type { Filters } from '@/types/filters';
import type { OpeningPeriod, PlaceSummary } from '@/types/place';
import {
  activeFilterChips,
  createDefaultFilters,
  filtersKey,
  isOpenLateToday,
  isOpenOnSunday,
  matchesFilters,
  sanitizeFilters,
} from '@/utils/filters';

const DEFAULT = createDefaultFilters(1500);
const with_ = (patch: Partial<Filters>): Filters => ({ ...DEFAULT, ...patch });
const place = (id: string): PlaceSummary => MOCK_PLACES.find((p) => p.id === id)!;
// Dienstag, 3. November 2026, 13:00
const TUESDAY = new Date(2026, 10, 3, 13, 0);

const period = (openDay: number, open: string, closeDay: number, close: string): OpeningPeriod => {
  const [oh, om] = open.split(':').map(Number) as [number, number];
  const [ch, cm] = close.split(':').map(Number) as [number, number];
  return {
    open: { day: openDay, hour: oh, minute: om },
    close: { day: closeDay, hour: ch, minute: cm },
  };
};

describe('Küchen-Filter', () => {
  it('findet Lokale über Küchengruppen (eine von mehreren reicht)', () => {
    const ramen = place('mock-ramen-kreuzberg'); // ramen, japanese
    expect(matchesFilters(ramen, with_({ cuisines: ['japanese'] }))).toBe(true);
    expect(matchesFilters(ramen, with_({ cuisines: ['asian'] }))).toBe(true);
    expect(matchesFilters(ramen, with_({ cuisines: ['italian'] }))).toBe(false);
    expect(matchesFilters(ramen, with_({ cuisines: ['italian', 'japanese'] }))).toBe(true);
  });

  it('Italienisch umfasst Pizza, Pizza aber nicht jedes italienische Lokal', () => {
    const lino = place('mock-italian-charlottenburg'); // italian, pizza
    expect(matchesFilters(lino, with_({ cuisines: ['italian'] }))).toBe(true);
    expect(matchesFilters(lino, with_({ cuisines: ['pizza'] }))).toBe(true);
    const onlyItalian = { ...lino, cuisines: ['italian'] };
    expect(matchesFilters(onlyItalian, with_({ cuisines: ['pizza'] }))).toBe(false);
  });

  it('Lokale ohne Küchenangabe fallen bei aktivem Küchen-Filter heraus', () => {
    expect(matchesFilters(place('mock-cafe-mitte'), with_({ cuisines: ['german'] }))).toBe(false);
  });
});

describe('Neue Merkmale', () => {
  it('prüfen Service-Angaben ausdrücklich', () => {
    const doener = place('mock-doener-kreuzberg'); // takeaway, delivery, keine Karte
    expect(matchesFilters(doener, with_({ attributes: ['takeaway', 'delivery'] }))).toBe(true);
    expect(matchesFilters(doener, with_({ attributes: ['cards'] }))).toBe(false);
    expect(matchesFilters(doener, with_({ attributes: ['reservable'] }))).toBe(false); // unbekannt
  });

  it('barrierefrei', () => {
    expect(matchesFilters(place('mock-cafe-mitte'), with_({ attributes: ['wheelchair'] }))).toBe(
      true,
    );
    expect(
      matchesFilters(place('mock-ramen-kreuzberg'), with_({ attributes: ['wheelchair'] })),
    ).toBe(false);
  });
});

describe('Öffnungszeiten-Filter', () => {
  it('spät geöffnet: bis mind. 23 Uhr oder über Mitternacht', () => {
    expect(isOpenLateToday([period(2, '12:00', 2, '23:00')], TUESDAY)).toBe(true);
    expect(isOpenLateToday([period(2, '12:00', 2, '22:30')], TUESDAY)).toBe(false);
    expect(isOpenLateToday([period(2, '19:00', 3, '02:00')], TUESDAY)).toBe(true);
    // anderer Tag zählt nicht
    expect(isOpenLateToday([period(5, '19:00', 6, '02:00')], TUESDAY)).toBe(false);
    // durchgehend geöffnet
    expect(isOpenLateToday([{ open: { day: 2, hour: 0, minute: 0 }, close: null }], TUESDAY)).toBe(
      true,
    );
  });

  it('sonntags geöffnet', () => {
    expect(isOpenOnSunday([period(0, '10:00', 0, '18:00')])).toBe(true);
    expect(isOpenOnSunday([period(1, '10:00', 1, '18:00')])).toBe(false);
  });

  it('wirkt in matchesFilters; ohne Öffnungszeiten kein Treffer', () => {
    const kurve = place('mock-bar-neukoelln'); // täglich 19:00–03:00
    const lunch = place('mock-lunch-mitte'); // Mo–Fr 11:30–15:30
    expect(matchesFilters(kurve, with_({ hours: ['lateOpen', 'sundayOpen'] }), TUESDAY)).toBe(true);
    expect(matchesFilters(lunch, with_({ hours: ['lateOpen'] }), TUESDAY)).toBe(false);
    expect(matchesFilters(lunch, with_({ hours: ['sundayOpen'] }), TUESDAY)).toBe(false);
    expect(
      matchesFilters(place('mock-new-wedding'), with_({ hours: ['sundayOpen'] }), TUESDAY),
    ).toBe(false);
  });
});

describe('Chips, Schlüssel, Speicherung', () => {
  it('zeigt Küche, Öffnungszeiten und neue Merkmale als Chips', () => {
    const f = with_({ cuisines: ['vietnamese'], hours: ['lateOpen'], attributes: ['cards'] });
    const chips = activeFilterChips(f, 1500);
    expect(chips.map((c) => c.label)).toEqual([
      'Vietnamesisch',
      'Heute spät geöffnet',
      'Kartenzahlung',
    ]);
    expect(chips[0]!.remove(f).cuisines).toEqual([]);
    expect(chips[1]!.remove(f).hours).toEqual([]);
  });

  it('filtersKey erkennt Änderungen an Küche und Öffnungszeiten', () => {
    expect(filtersKey(with_({ cuisines: ['greek'] }))).not.toBe(filtersKey(DEFAULT));
    expect(filtersKey(with_({ hours: ['sundayOpen'] }))).not.toBe(filtersKey(DEFAULT));
  });

  it('übernimmt gültige neue Werte und verwirft ungültige', () => {
    expect(
      sanitizeFilters(
        {
          cuisines: ['greek', 'klingonisch'],
          hours: ['sundayOpen', 'immer'],
          attributes: ['wifi'],
        },
        1500,
      ),
    ).toEqual(with_({ cuisines: ['greek'], hours: ['sundayOpen'], attributes: ['wifi'] }));
  });

  it('ältere gespeicherte Filter ohne die neuen Felder bleiben gültig', () => {
    const old = { ...DEFAULT } as Partial<Filters>;
    delete old.cuisines;
    delete old.hours;
    expect(sanitizeFilters(old, 1500)).toEqual(DEFAULT);
  });
});
