import { PlacesError } from '@/services/places/errors';
import { MOCK_PLACES } from '@/services/places/mock-data';
import { MockPlacesProvider, normalizeText } from '@/services/places/mock-provider';
import type { SearchQuery } from '@/services/places/provider';

const KREUZBERG = { latitude: 52.4985, longitude: 13.425 };
const BERLIN_WIDE: SearchQuery = {
  center: { latitude: 52.515, longitude: 13.4 },
  radiusMeters: 20_000,
};

const provider = new MockPlacesProvider({ latencyMs: 0, pageSize: 5 });
const ids = async (q: SearchQuery) => {
  const all: string[] = [];
  let token: string | undefined;
  do {
    const r = await provider.search({ ...q, pageToken: token });
    all.push(...r.places.map((p) => p.id));
    token = r.nextPageToken ?? undefined;
  } while (token);
  return all;
};

describe('MockPlacesProvider', () => {
  it('normalisiert Text ohne Akzente', () => {
    expect(normalizeText('Café Bäckerei')).toBe('cafe backerei');
  });

  it('findet „vegan Kreuzberg“ über alle Begriffe hinweg', async () => {
    const result = await ids({ ...BERLIN_WIDE, text: 'vegan Kreuzberg' });
    expect(result).toEqual(
      expect.arrayContaining(['mock-ramen-kreuzberg', 'mock-vegan-kreuzberg']),
    );
    expect(result).not.toContain('mock-vietnamese-friedrichshain'); // vegan, aber nicht Kreuzberg
  });

  it('filtert Nicht-Gastronomie heraus', async () => {
    expect(await ids(BERLIN_WIDE)).not.toContain('mock-hotel-mitte');
  });

  it('beachtet den Radius', async () => {
    const near = await ids({ center: KREUZBERG, radiusMeters: 1000 });
    expect(near).toContain('mock-vegan-kreuzberg');
    expect(near).not.toContain('mock-italian-charlottenburg');
  });

  it('beachtet Kategorie, Mindestbewertung, Preis und „jetzt geöffnet“', async () => {
    const bars = await ids({ ...BERLIN_WIDE, category: 'bar' });
    expect(bars).toEqual(expect.arrayContaining(['mock-bar-neukoelln', 'mock-wine-schoeneberg']));
    expect(bars).not.toContain('mock-cafe-mitte');

    // 4,7 wird wie bei Google auf 4,5 abgerundet.
    const top = await ids({ ...BERLIN_WIDE, minRating: 4.7 });
    expect(top.every((id) => (MOCK_PLACES.find((p) => p.id === id)?.rating ?? 0) >= 4.5)).toBe(
      true,
    );
    expect(top).not.toContain('mock-new-wedding'); // ohne Bewertung

    const cheap = await ids({ ...BERLIN_WIDE, priceLevels: [1] });
    expect(cheap).not.toContain('mock-fine-mitte');

    const open = await ids({ ...BERLIN_WIDE, openNow: true });
    expect(open).not.toContain('mock-bakery-prenzlauer');
  });

  it('teilt Ergebnisse in Seiten auf, ohne Doppelte', async () => {
    const first = await provider.search(BERLIN_WIDE);
    expect(first.places).toHaveLength(5);
    expect(first.nextPageToken).toBe('5');
    const all = await ids(BERLIN_WIDE);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(MOCK_PLACES.length - 1); // alle außer dem Hotel
  });

  it('liefert Details ohne interne Mock-Felder', async () => {
    const d = await provider.getDetails('mock-ramen-kreuzberg');
    expect(d.source).toBe('mock');
    expect(d.reviews.length).toBeGreaterThan(0);
    expect(d.openingHours?.weekdayDescriptions[0]).toMatch(/^Montag: /);
    expect(d).not.toHaveProperty('keywords');
    expect(d).not.toHaveProperty('district');
  });

  it('liefert Kurzdaten ohne Detailfelder', async () => {
    const s = await provider.getSummary('mock-closed-moabit');
    expect(s.businessStatus).toBe('closed_permanently');
    expect(s).not.toHaveProperty('reviews');
    await expect(provider.getSummary('x')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('wirft not_found für unbekannte IDs', async () => {
    await expect(provider.getDetails('gibt-es-nicht')).rejects.toBeInstanceOf(PlacesError);
    await expect(provider.getDetails('gibt-es-nicht')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('enthält die Sonderfälle für die Oberfläche', () => {
    const counts = MOCK_PLACES.map((p) => p.ratingCount);
    expect(counts.some((c) => c > 0 && c < 30)).toBe(true);
    expect(counts).toContain(0);
    expect(MOCK_PLACES.some((p) => p.businessStatus === 'closed_permanently')).toBe(true);
    expect(MOCK_PLACES.some((p) => p.businessStatus === 'closed_temporarily')).toBe(true);
  });
});
