import { resolveSource } from '@/services/places';
import { readConfig } from '@/services/config';

describe('readConfig', () => {
  it('ohne Key: kein Schlüssel', () => {
    expect(readConfig({})).toEqual({ placesApiKey: null });
  });

  it('behandelt einen leeren Key wie keinen Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: '   ' }).placesApiKey).toBeNull();
  });

  it('übernimmt einen gesetzten Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: ' abc ' })).toEqual({ placesApiKey: 'abc' });
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
