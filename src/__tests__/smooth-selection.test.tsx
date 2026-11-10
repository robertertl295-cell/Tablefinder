import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { cardBadges } from '@/components/place/place-card';
import {
  CAROUSEL_TILES,
  CuisineCarousel,
  isTileSelected,
  toggleTile,
} from '@/components/search/cuisine-carousel';
import { SOURCE_CAPABILITIES } from '@/services/places/capabilities';
import { MOCK_PLACES } from '@/services/places/mock-data';
import { EMPTY_ATTRIBUTES, type PlaceSummary } from '@/types/place';
import { createDefaultFilters, quickFilters } from '@/utils/filters';
import { formatWalkingTime, spokenWalkingTime, walkingMinutes } from '@/utils/walking';

const DEFAULT = createDefaultFilters(1500);

describe('Gehzeit', () => {
  it('schätzt aus der Luftlinie mit Umwegfaktor, mindestens 1 Minute', () => {
    expect(walkingMinutes(0)).toBe(1);
    expect(walkingMinutes(370)).toBe(6); // 370 m × 1,3 / 80 m/min ≈ 6
    expect(formatWalkingTime(370)).toBe('6 Min.');
    expect(formatWalkingTime(3700)).toBe('1 Std.');
    expect(formatWalkingTime(4000)).toBe('1 Std. 5 Min.');
    expect(spokenWalkingTime(30)).toBe('1 Minute zu Fuß');
    expect(spokenWalkingTime(370)).toBe('6 Minuten zu Fuß');
  });
});

describe('Schnellfilter', () => {
  it('passt zur Quelle: OSM ohne Bewertung/Preis, kombiniert mit allem', () => {
    const osm = quickFilters(SOURCE_CAPABILITIES.osm).map((q) => q.id);
    expect(osm).toEqual([
      'openNow',
      'attribute:outdoorSeating',
      'attribute:vegan',
      'hours:lateOpen',
    ]);
    const combined = quickFilters(SOURCE_CAPABILITIES.combined).map((q) => q.id);
    expect(combined).toContain('minRating');
    expect(combined).toContain('priceLevels');
    // Google allein kennt „vegan“ nicht → vegetarisch
    expect(quickFilters(SOURCE_CAPABILITIES.google).map((q) => q.id)).toContain(
      'attribute:vegetarian',
    );
  });

  it('setzt Filter mit einem Tipp und erkennt, ob sie aktiv sind', () => {
    const qs = quickFilters(SOURCE_CAPABILITIES.combined);
    let f = DEFAULT;
    for (const q of qs) {
      expect(q.isActive(f)).toBe(false);
      f = q.apply(f);
      expect(q.isActive(f)).toBe(true);
    }
    expect(f).toMatchObject({
      openNow: true,
      minRating: 4.5,
      priceLevels: [1, 2],
      hours: ['lateOpen'],
    });
    expect(f.attributes).toEqual(['outdoorSeating', 'vegan']);
  });
});

describe('Küchen-Karussell', () => {
  it('schaltet Küche bzw. Art um', () => {
    const pizza = CAROUSEL_TILES.find((t) => t.id === 'pizza')!;
    const cafe = CAROUSEL_TILES.find((t) => t.id === 'cafe')!;
    const on = toggleTile(pizza, toggleTile(cafe, DEFAULT));
    expect(on.cuisines).toEqual(['pizza']);
    expect(on.categories).toEqual(['cafe']);
    expect(isTileSelected(pizza, on)).toBe(true);
    expect(isTileSelected(pizza, toggleTile(pizza, on))).toBe(false);
  });

  it('Antippen meldet die neuen Filter', async () => {
    const onChange = jest.fn();
    await render(<CuisineCarousel filters={DEFAULT} onChange={onChange} />);
    await act(async () => fireEvent.press(screen.getByLabelText('Sushi')));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cuisines: ['japanese'] }));
  });
});

describe('Kurzinfos auf der Karte', () => {
  const base: PlaceSummary = {
    ...MOCK_PLACES[0]!,
    attributes: { ...EMPTY_ATTRIBUTES },
    periods: [{ open: { day: 2, hour: 12, minute: 0 }, close: { day: 2, hour: 23, minute: 0 } }],
  };
  // Dienstag, 10. November 2026, 19:00
  const now = new Date(2026, 10, 10, 19, 0);

  it('Gehzeit, „bis 23:00“ und ein Merkmal (vegan vor Terrasse)', () => {
    const vegan = {
      ...base,
      attributes: { ...EMPTY_ATTRIBUTES, vegan: true, outdoorSeating: true },
    };
    expect(cardBadges(vegan, 370, now)).toEqual(['🚶 6 Min.', 'bis 23:00', 'Vegan']);
  });

  it('ohne Standort, geschlossen und ohne Merkmale: keine Badges', () => {
    expect(cardBadges(base, null, new Date(2026, 10, 10, 9, 0))).toEqual([]);
  });

  it('durchgehend geöffnet: „24 h“', () => {
    const allDay = { ...base, periods: [{ open: { day: 0, hour: 0, minute: 0 }, close: null }] };
    expect(cardBadges(allDay, null, now)).toEqual(['24 h']);
  });
});
