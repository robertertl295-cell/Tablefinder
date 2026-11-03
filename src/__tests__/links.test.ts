import { directionsUrl, displayUrl, phoneUrl } from '@/utils/links';

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
