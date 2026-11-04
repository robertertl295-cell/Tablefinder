import { resolveSource } from '@/services/places';
import { readConfig } from '@/services/config';

describe('readConfig', () => {
  it('ohne Key: kein Schlüssel', () => {
    expect(readConfig({})).toEqual({
      placesApiKey: null,
      osmDatasetUrl: null,
      placeholderBaseUrl: null,
      googleMapsKey: null,
      googleMapId: 'DEMO_MAP_ID',
    });
  });

  it('behandelt einen leeren Key wie keinen Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: '   ' }).placesApiKey).toBeNull();
  });

  it('übernimmt einen gesetzten Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: ' abc ' }).placesApiKey).toBe('abc');
  });
});

it('liest die Adresse des OSM-Datensatzes', () => {
  expect(readConfig({ EXPO_PUBLIC_OSM_DATASET_URL: '/Tablefinder/data/osm-berlin.json' })).toEqual({
    placesApiKey: null,
    osmDatasetUrl: '/Tablefinder/data/osm-berlin.json',
    placeholderBaseUrl: null,
    googleMapsKey: null,
    googleMapId: 'DEMO_MAP_ID',
  });
});

describe('resolveSource', () => {
  it('Automatisch: Google mit Key, sonst OpenStreetMap', () => {
    expect(resolveSource('auto', true)).toBe('google');
    expect(resolveSource('auto', false)).toBe('osm');
  });

  it('Google ohne Key fällt auf OpenStreetMap zurück', () => {
    expect(resolveSource('google', false)).toBe('osm');
    expect(resolveSource('google', true)).toBe('google');
  });

  it('OSM und Beispieldaten gelten immer', () => {
    expect(resolveSource('osm', true)).toBe('osm');
    expect(resolveSource('mock', true)).toBe('mock');
  });
});

it('nutzt den Places-Key auch für die Google-Karte, eigener Karten-Key hat Vorrang', () => {
  expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: 'p' }).googleMapsKey).toBe('p');
  expect(
    readConfig({ EXPO_PUBLIC_PLACES_API_KEY: 'p', EXPO_PUBLIC_GOOGLE_MAPS_KEY: 'm' }).googleMapsKey,
  ).toBe('m');
  expect(readConfig({ EXPO_PUBLIC_GOOGLE_MAP_ID: 'abc' }).googleMapId).toBe('abc');
});
