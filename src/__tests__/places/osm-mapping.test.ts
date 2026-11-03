import { categoryOf, isGastronomyPlace } from '@/services/places/place-types';
import {
  isOsmId,
  mapOsmElement,
  osmId,
  osmSearchText,
  parseOsmId,
  withoutPlaceWords,
} from '@/services/places/osm-mapping';

import {
  OSM_BAKERY,
  OSM_CAFE,
  OSM_KEBAB,
  OSM_NO_NAME,
  OSM_PUB_ODD_HOURS,
  OSM_RAMEN,
} from '../fixtures/overpass';

describe('OSM-IDs', () => {
  it('bauen und zerlegen', () => {
    expect(osmId({ type: 'way', id: 202 })).toBe('osm:way:202');
    expect(parseOsmId('osm:node:101')).toEqual({ type: 'node', id: 101 });
    expect(parseOsmId('ChIJabc')).toBeNull();
    expect(isOsmId('osm:relation:1')).toBe(true);
    expect(isOsmId('mock-cafe')).toBe(false);
  });
});

describe('mapOsmElement', () => {
  it('übernimmt Name, Art, Küche, Adresse, Kontakt und Quelle', () => {
    const p = mapOsmElement(OSM_RAMEN)!;
    expect(p).toMatchObject({
      id: 'osm:node:101',
      source: 'osm',
      name: 'Ramen Yokai',
      primaryType: 'ramen_restaurant',
      typeLabel: 'Restaurant · Ramen, Japanisch',
      location: { latitude: 52.5009, longitude: 13.4186 },
      shortAddress: 'Oranienstraße 12, Berlin',
      formattedAddress: 'Oranienstraße 12, 10999 Berlin',
      phone: '+49 30 1234567',
      website: 'https://ramen-yokai.example',
      mapsUri: 'https://www.openstreetmap.org/node/101',
      // OSM kennt keine Bewertungen, Preise, Fotos
      rating: null,
      ratingCount: 0,
      priceLevel: null,
      photo: null,
      reviews: [],
    });
  });

  it('liest Diät- und Angebotsangaben; vegan schließt vegetarisch ein', () => {
    expect(mapOsmElement(OSM_RAMEN)!.attributes).toMatchObject({
      vegan: true,
      vegetarian: true,
      outdoorSeating: true,
      dogsAllowed: null,
      goodForGroups: null,
    });
    expect(mapOsmElement(OSM_CAFE)!.attributes).toMatchObject({
      vegan: null,
      vegetarian: true,
      dogsAllowed: true,
    });
    expect(mapOsmElement(OSM_KEBAB)!.attributes.vegan).toBe(false);
  });

  it('nutzt Mittelpunkte von Wegen und contact:website', () => {
    const p = mapOsmElement(OSM_CAFE)!;
    expect(p.location).toEqual({ latitude: 52.499, longitude: 13.421 });
    expect(p.website).toBe('https://cafe-ufer.example');
    expect(p.typeLabel).toBe('Café · Kaffee, Kuchen');
  });

  it('ordnet Arten den App-Kategorien zu', () => {
    const cats = (el: Parameters<typeof mapOsmElement>[0]) => {
      const p = mapOsmElement(el)!;
      expect(isGastronomyPlace(p.primaryType, p.types)).toBe(true);
      return categoryOf(p.primaryType, p.types);
    };
    expect(cats(OSM_RAMEN)).toContain('restaurant');
    expect(cats(OSM_CAFE)).toEqual(['cafe']);
    expect(cats(OSM_KEBAB)).toContain('takeaway');
    expect(cats(OSM_BAKERY)).toEqual(['bakery']);
    expect(cats(OSM_PUB_ODD_HOURS)).toEqual(['bar']);
  });

  it('wandelt Öffnungszeiten um; Unbekanntes bleibt null', () => {
    expect(mapOsmElement(OSM_RAMEN)!.openingHours?.weekdayDescriptions[0]).toBe(
      'Montag: Geschlossen',
    );
    expect(mapOsmElement(OSM_PUB_ODD_HOURS)!.openingHours).toBeNull();
  });

  it('verwirft Orte ohne Namen, Koordinaten oder Gastronomie-Art', () => {
    expect(mapOsmElement(OSM_NO_NAME)).toBeNull();
    expect(mapOsmElement({ type: 'way', id: 1, tags: { amenity: 'cafe', name: 'X' } })).toBeNull();
    expect(
      mapOsmElement({ type: 'node', id: 2, lat: 1, lon: 1, tags: { amenity: 'bank', name: 'B' } }),
    ).toBeNull();
  });
});

describe('Suchtext', () => {
  it('enthält deutsche Küchenbegriffe und Diät-Wörter', () => {
    const text = osmSearchText(mapOsmElement(OSM_RAMEN)!, OSM_RAMEN);
    expect(text).toContain('japanisch');
    expect(text).toContain('vegan');
    expect(text).toContain('oranienstra');
    expect(osmSearchText(mapOsmElement(OSM_KEBAB)!, OSM_KEBAB)).toContain('doner');
  });

  it('entfernt Ortsangaben aus dem Suchbegriff', () => {
    expect(withoutPlaceWords(['vegan', 'kreuzberg'])).toEqual(['vegan']);
    expect(withoutPlaceWords(['ramen', 'prenzlauer', 'berg', 'berlin'])).toEqual(['ramen']);
  });
});
