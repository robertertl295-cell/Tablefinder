import { directionsUrl, displayUrl, mapsPlatform, phoneUrl } from '@/utils/links';

const LOC = { latitude: 52.5009, longitude: 13.4186 };

describe('directionsUrl', () => {
  it('öffnet auf iOS Apple Maps mit Ziel', () => {
    expect(directionsUrl('ios', LOC, 'Nudelwerk Ramen')).toBe(
      'https://maps.apple.com/?daddr=52.5009,13.4186&q=Nudelwerk%20Ramen',
    );
  });

  it('nutzt auf Android geo: (Auswahl der Karten-App)', () => {
    expect(directionsUrl('android', LOC, 'Café & Bar')).toBe(
      'geo:52.5009,13.4186?q=52.5009,13.4186(Caf%C3%A9%20%26%20Bar)',
    );
  });

  it('fällt sonst auf Google Maps im Browser zurück', () => {
    expect(directionsUrl('web', LOC, 'x')).toContain('destination=52.5009,13.4186');
  });
});

describe('phoneUrl / displayUrl', () => {
  it('entfernt Leer- und Trennzeichen', () => {
    expect(phoneUrl('+49 30 123-456 01')).toBe('tel:+4930123456' + '01');
    expect(phoneUrl('030 / 1234')).toBe('tel:0301234');
  });

  it('kürzt URLs für die Anzeige', () => {
    expect(displayUrl('https://www.example.com/')).toBe('example.com');
    expect(displayUrl('http://example.com/karte')).toBe('example.com/karte');
  });
});

describe('mapsPlatform', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
  it('nativ: Betriebssystem', () => {
    expect(mapsPlatform('ios', '')).toBe('ios');
    expect(mapsPlatform('android', '')).toBe('android');
  });
  it('Web-App auf dem iPhone öffnet Apple Maps', () => {
    expect(mapsPlatform('web', IPHONE)).toBe('ios');
    expect(
      directionsUrl(mapsPlatform('web', IPHONE), { latitude: 1, longitude: 2 }, 'X'),
    ).toContain('maps.apple.com');
  });
  it('Web auf Android bzw. Desktop', () => {
    expect(mapsPlatform('web', 'Mozilla/5.0 (Linux; Android 15)')).toBe('android');
    expect(mapsPlatform('web', 'Mozilla/5.0 (X11; Linux x86_64)')).toBe('web');
  });
});
