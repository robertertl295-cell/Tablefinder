import { mapPlaceDetails, mapPlaceSummary, mapPriceLevel } from '@/services/places/mapping';

import { FULL_PLACE } from '../fixtures/google-place';

describe('mapPriceLevel', () => {
  it('wandelt Google-Stufen in 1–4 um', () => {
    expect(mapPriceLevel('PRICE_LEVEL_INEXPENSIVE')).toBe(1);
    expect(mapPriceLevel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4);
  });

  it('liefert null für unbekannt, kostenlos und fehlend', () => {
    expect(mapPriceLevel('PRICE_LEVEL_UNSPECIFIED')).toBeNull();
    expect(mapPriceLevel('PRICE_LEVEL_FREE')).toBeNull();
    expect(mapPriceLevel(undefined)).toBeNull();
  });
});

describe('mapPlaceSummary', () => {
  it('übernimmt alle Felder', () => {
    const s = mapPlaceSummary(FULL_PLACE);
    expect(s).toMatchObject({
      id: 'ChIJabc',
      name: 'Testlokal',
      primaryType: 'ramen_restaurant',
      typeLabel: 'Ramen-Restaurant',
      location: { latitude: 52.5, longitude: 13.42 },
      shortAddress: 'Oranienstraße 1, Berlin',
      rating: 4.6,
      ratingCount: 120,
      priceLevel: 2,
      openNow: true,
      businessStatus: 'operational',
    });
    expect(s.photo).toEqual({
      name: 'places/ChIJabc/photos/p1',
      widthPx: 800,
      heightPx: 600,
      attributions: [{ displayName: 'Ana', uri: 'https://maps.google.com/ana' }],
    });
    expect(s.attributes.vegetarian).toBe(true);
    expect(s.attributes.outdoorSeating).toBe(false);
    expect(s.attributes.dogsAllowed).toBeNull();
  });

  it('setzt fehlende Angaben auf null statt zu raten', () => {
    const s = mapPlaceSummary({ id: 'x', location: { latitude: 1, longitude: 2 } });
    expect(s).toMatchObject({
      name: 'Unbenannter Ort',
      primaryType: null,
      rating: null,
      ratingCount: 0,
      priceLevel: null,
      openNow: null,
      businessStatus: 'unknown',
      photo: null,
      shortAddress: null,
    });
  });

  it('erkennt dauerhaft geschlossene Orte', () => {
    expect(
      mapPlaceSummary({ ...FULL_PLACE, businessStatus: 'CLOSED_PERMANENTLY' }).businessStatus,
    ).toBe('closed_permanently');
  });

  it('wirft bei fehlender ID oder fehlenden Koordinaten', () => {
    expect(() => mapPlaceSummary({ location: { latitude: 1, longitude: 2 } })).toThrow();
    expect(() => mapPlaceSummary({ id: 'x' })).toThrow();
  });
});

describe('mapPlaceDetails', () => {
  it('übernimmt Kontakt, Öffnungszeiten, Fotos und Rezensionen', () => {
    const d = mapPlaceDetails(FULL_PLACE);
    expect(d.source).toBe('google');
    expect(d.phone).toBe('030 123456');
    expect(d.website).toBe('https://example.com');
    expect(d.openingHours?.weekdayDescriptions).toEqual(['Montag: 12:00–22:00']);
    expect(d.openingHours?.periods[0]).toEqual({
      open: { day: 1, hour: 12, minute: 0 },
      close: { day: 1, hour: 22, minute: 0 },
    });
    expect(d.photos).toHaveLength(2);
    expect(d.reviews[0]).toMatchObject({
      id: 'places/ChIJabc/reviews/r1',
      authorName: 'Ben',
      rating: 5,
      text: 'Super',
      relativeTime: 'vor einer Woche',
    });
  });

  it('nutzt reguläre Öffnungszeiten, wenn aktuelle fehlen', () => {
    const d = mapPlaceDetails({
      ...FULL_PLACE,
      currentOpeningHours: undefined,
      regularOpeningHours: { openNow: false, weekdayDescriptions: ['Montag: Geschlossen'] },
    });
    expect(d.openNow).toBe(false);
    expect(d.openingHours?.weekdayDescriptions).toEqual(['Montag: Geschlossen']);
  });

  it('versteht durchgehend geöffnete Zeiträume ohne Ende', () => {
    const d = mapPlaceDetails({
      ...FULL_PLACE,
      currentOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] },
    });
    expect(d.openingHours?.periods).toEqual([
      { open: { day: 0, hour: 0, minute: 0 }, close: null },
    ]);
  });
});
