import { MOCK_PLACES } from '@/services/places/mock-data';
import type { Filters } from '@/types/filters';
import type { PlaceSummary } from '@/types/place';
import {
  activeFilterChips,
  createDefaultFilters,
  filtersKey,
  filtersToQuery,
  matchesFilters,
  needsAttributes,
  sanitizeFilters,
  toggle,
} from '@/utils/filters';

const DEFAULT = createDefaultFilters(1500);
const place = (id: string): PlaceSummary => {
  const p = MOCK_PLACES.find((m) => m.id === id);
  if (!p) throw new Error(id);
  return p;
};
const RAMEN = place('mock-ramen-kreuzberg'); // 4,6 ★, 1284, €€, offen, vegetarisch
const VEGAN = place('mock-vegan-kreuzberg'); // 4,8 ★, nur 22 Bewertungen, Hunde ok
const NEW = place('mock-new-wedding'); // keine Bewertungen, keine Angaben
const with_ = (patch: Partial<Filters>): Filters => ({ ...DEFAULT, ...patch });

describe('matchesFilters', () => {
  it('lässt ohne Filter alles durch', () => {
    expect([RAMEN, VEGAN, NEW].every((p) => matchesFilters(p, DEFAULT))).toBe(true);
  });

  it('Art: mindestens eine der gewählten Kategorien', () => {
    expect(matchesFilters(RAMEN, with_({ categories: ['restaurant'] }))).toBe(true);
    expect(matchesFilters(RAMEN, with_({ categories: ['cafe', 'bar'] }))).toBe(false);
    expect(matchesFilters(place('mock-cafe-mitte'), with_({ categories: ['cafe', 'bar'] }))).toBe(
      true,
    );
  });

  it('Mindestbewertung schließt Orte ohne Bewertung aus', () => {
    expect(matchesFilters(RAMEN, with_({ minRating: 4.5 }))).toBe(true);
    expect(matchesFilters(place('mock-burger-friedrichshain'), with_({ minRating: 4 }))).toBe(
      false,
    );
    expect(matchesFilters(NEW, with_({ minRating: 3.5 }))).toBe(false);
  });

  it('Mindestanzahl Bewertungen filtert dünne Datenbasis heraus', () => {
    expect(matchesFilters(VEGAN, with_({ minRatingCount: 30 }))).toBe(false);
    expect(matchesFilters(RAMEN, with_({ minRatingCount: 500 }))).toBe(true);
  });

  it('Preisniveau: eines der gewählten, unbekannt fällt raus', () => {
    expect(matchesFilters(RAMEN, with_({ priceLevels: [1, 2] }))).toBe(true);
    expect(matchesFilters(RAMEN, with_({ priceLevels: [3] }))).toBe(false);
    expect(matchesFilters(NEW, with_({ priceLevels: [1] }))).toBe(false);
  });

  it('Jetzt geöffnet verlangt eine sichere Angabe', () => {
    expect(matchesFilters(RAMEN, with_({ openNow: true }))).toBe(true);
    expect(matchesFilters(place('mock-bakery-prenzlauer'), with_({ openNow: true }))).toBe(false);
    expect(matchesFilters(NEW, with_({ openNow: true }))).toBe(false);
  });

  it('Merkmale und Mahlzeiten: alle müssen ausdrücklich zutreffen', () => {
    expect(matchesFilters(VEGAN, with_({ attributes: ['vegetarian', 'dogsAllowed'] }))).toBe(true);
    expect(matchesFilters(RAMEN, with_({ attributes: ['vegetarian', 'dogsAllowed'] }))).toBe(false);
    expect(matchesFilters(NEW, with_({ attributes: ['vegetarian'] }))).toBe(false); // null
    expect(matchesFilters(RAMEN, with_({ meals: ['lunch', 'dinner'] }))).toBe(true);
    expect(matchesFilters(RAMEN, with_({ meals: ['breakfast'] }))).toBe(false);
  });
});

describe('filtersToQuery', () => {
  it('reicht nur API-fähige Teile durch', () => {
    expect(filtersToQuery(DEFAULT)).toEqual({
      category: undefined,
      minRating: undefined,
      priceLevels: undefined,
      openNow: undefined,
      includeAttributes: undefined,
    });
  });

  it('gibt genau eine Kategorie an die API, mehrere nicht', () => {
    expect(filtersToQuery(with_({ categories: ['cafe'] })).category).toBe('cafe');
    expect(filtersToQuery(with_({ categories: ['cafe', 'bar'] })).category).toBeUndefined();
  });

  it('lädt Merkmal-Felder nur bei Merkmal- oder Mahlzeit-Filtern', () => {
    expect(needsAttributes(DEFAULT)).toBe(false);
    expect(filtersToQuery(with_({ meals: ['breakfast'] })).includeAttributes).toBe(true);
    expect(filtersToQuery(with_({ attributes: ['dogsAllowed'] })).includeAttributes).toBe(true);
    expect(filtersToQuery(with_({ minRatingCount: 100 })).includeAttributes).toBeUndefined();
  });
});

describe('activeFilterChips', () => {
  it('zeigt keine Chips für Standardwerte', () => {
    expect(activeFilterChips(DEFAULT, 1500)).toEqual([]);
  });

  it('beschriftet alle aktiven Filter verständlich', () => {
    const f = with_({
      categories: ['cafe'],
      openNow: true,
      minRating: 4,
      minRatingCount: 100,
      priceLevels: [2, 1],
      radiusMeters: 3000,
      attributes: ['outdoorSeating'],
      meals: ['breakfast'],
    });
    expect(activeFilterChips(f, 1500).map((c) => c.label)).toEqual([
      'Café',
      'Jetzt geöffnet',
      'ab 4,0 ★',
      'ab 100 Bewertungen',
      '€, €€',
      'Umkreis 3,0 km',
      'Außenplätze',
      'Frühstück',
    ]);
  });

  it('entfernt mit jedem Chip genau seinen Filter', () => {
    const f = with_({ categories: ['cafe', 'bar'], openNow: true, radiusMeters: 500 });
    const chips = activeFilterChips(f, 1500);
    const cafe = chips.find((c) => c.id === 'category:cafe');
    expect(cafe?.remove(f)).toEqual({ ...f, categories: ['bar'] });
    const radius = chips.find((c) => c.id === 'radius');
    expect(radius?.remove(f).radiusMeters).toBe(1500);
  });
});

describe('Hilfsfunktionen', () => {
  it('filtersKey ist unabhängig von der Reihenfolge', () => {
    expect(filtersKey(with_({ priceLevels: [1, 2], meals: ['lunch', 'dinner'] }))).toBe(
      filtersKey(with_({ priceLevels: [2, 1], meals: ['dinner', 'lunch'] })),
    );
    expect(filtersKey(DEFAULT)).not.toBe(filtersKey(with_({ openNow: true })));
  });

  it('toggle fügt hinzu und entfernt', () => {
    expect(toggle([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggle([1, 2], 1)).toEqual([2]);
  });
});

describe('sanitizeFilters', () => {
  it('übernimmt gültige Werte', () => {
    const f = with_({ categories: ['bar'], minRating: 4.5, radiusMeters: 5000 });
    expect(sanitizeFilters(f, 1500)).toEqual(f);
  });

  it('ersetzt Ungültiges durch Standardwerte und entfernt Doppelte', () => {
    expect(
      sanitizeFilters(
        {
          categories: ['bar', 'bar', 'kino'],
          minRating: 4.2,
          minRatingCount: '100',
          priceLevels: [1, 9],
          openNow: 'ja',
          radiusMeters: 123,
          attributes: ['vegan'],
          meals: null,
        },
        1500,
      ),
    ).toEqual({ ...DEFAULT, categories: ['bar'], priceLevels: [1] });
  });

  it('verkraftet fehlende oder kaputte Daten', () => {
    expect(sanitizeFilters(undefined, 1500)).toEqual(DEFAULT);
    expect(sanitizeFilters('Unsinn', 1500)).toEqual(DEFAULT);
  });
});
