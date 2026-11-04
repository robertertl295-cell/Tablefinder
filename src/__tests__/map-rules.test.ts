import { mayShowDetailsOnMap } from '@/services/places/map-rules';

describe('EWR-Kartenregeln', () => {
  it('Google-Inhalte nie zusammen mit einer Karte, OSM und Beispieldaten schon', () => {
    expect(mayShowDetailsOnMap('google')).toBe(false);
    expect(mayShowDetailsOnMap('osm')).toBe(true);
    expect(mayShowDetailsOnMap('mock')).toBe(true);
  });
});
