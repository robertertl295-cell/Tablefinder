import catalog from '../../scripts/placeholder-catalog.json';

import { MOCK_PLACES } from '@/services/places/mock-data';
import {
  hashId,
  pickPlaceholder,
  placeholderGroup,
  PLACEHOLDER_GROUPS,
  type PlaceholderManifest,
} from '@/services/placeholders/placeholders';
import shippedManifest from '@/services/placeholders/manifest.json';
import type { PlaceSummary } from '@/types/place';

const base = MOCK_PLACES.find((p) => p.id === 'mock-ramen-kreuzberg')!;
const place = (patch: Partial<PlaceSummary>): PlaceSummary => ({
  ...base,
  primaryType: 'restaurant',
  typeLabel: 'Restaurant',
  types: ['restaurant'],
  cuisines: [],
  ...patch,
});

/** Manifest mit allen Szenen aus dem Katalog – so, als wären alle Bilder erzeugt. */
const fullManifest: PlaceholderManifest = {
  version: 1,
  generator: 'test',
  images: Object.fromEntries(
    Object.entries(catalog.groups).map(([group, g]) => [
      group,
      g.scenes.map((s, i) => ({ file: `${group}-${i + 1}.webp`, tags: s.tags })),
    ]),
  ),
};

describe('Katalog', () => {
  it('passt zu den Gruppen der App', () => {
    expect(Object.keys(catalog.groups).sort()).toEqual([...PLACEHOLDER_GROUPS].sort());
  });

  it('hat je Gruppe 6 Szenen, darunter Terrasse und vegetarisch', () => {
    for (const g of Object.values(catalog.groups)) {
      expect(g.scenes).toHaveLength(6);
      expect(g.scenes.some((s) => s.tags.includes('terrace'))).toBe(true);
      expect(g.scenes.some((s) => s.tags.includes('veggie'))).toBe(true);
    }
  });

  it('das ausgelieferte Manifest passt zum Katalog', () => {
    expect(shippedManifest.version).toBe(1);
    for (const group of Object.keys(shippedManifest.images)) {
      expect(PLACEHOLDER_GROUPS).toContain(group);
    }
  });
});

describe('placeholderGroup', () => {
  it('ordnet nach Küche zu, spezifisch vor allgemein', () => {
    expect(placeholderGroup(place({ cuisines: ['italian', 'pizza'] }))).toBe('pizza');
    expect(placeholderGroup(place({ cuisines: ['italian'] }))).toBe('italian');
    expect(placeholderGroup(place({ cuisines: ['ramen', 'japanese'] }))).toBe('japanese');
    expect(placeholderGroup(place({ cuisines: ['kebab'] }))).toBe('turkish');
    expect(placeholderGroup(place({ cuisines: ['falafel'] }))).toBe('middle_eastern');
    expect(placeholderGroup(place({ cuisines: ['asian'] }))).toBe('asian');
  });

  it('nutzt Google-Typen, wenn keine Küche bekannt ist', () => {
    expect(placeholderGroup(place({ primaryType: 'sushi_restaurant' }))).toBe('japanese');
    expect(placeholderGroup(place({ primaryType: 'cafe', types: ['cafe'] }))).toBe('cafe');
    expect(placeholderGroup(place({ primaryType: 'fast_food_restaurant' }))).toBe('imbiss');
  });

  it('Eisdiele, Bäckerei und Biergarten haben Vorrang vor der Küche', () => {
    expect(placeholderGroup(place({ primaryType: 'ice_cream_shop', cuisines: ['italian'] }))).toBe(
      'ice_cream',
    );
    expect(placeholderGroup(place({ primaryType: 'bakery', types: ['bakery'] }))).toBe('bakery');
    expect(placeholderGroup(place({ typeLabel: 'Biergarten', primaryType: 'bar' }))).toBe(
      'biergarten',
    );
    expect(placeholderGroup(place({ primaryType: 'pub', types: ['pub'] }))).toBe('pub');
  });

  it('fällt auf „restaurant“ zurück', () => {
    expect(placeholderGroup(place({ primaryType: null, types: [] }))).toBe('restaurant');
  });
});

describe('pickPlaceholder', () => {
  const BASE = '/Tablefinder/placeholders';

  it('ohne Bilder oder ohne Adresse: kein Symbolbild', () => {
    expect(
      pickPlaceholder(place({}), { version: 1, generator: null, images: {} }, BASE),
    ).toBeNull();
    expect(pickPlaceholder(place({}), fullManifest, null)).toBeNull();
  });

  it('gleiche ID → gleiches Bild (stabil)', () => {
    const p = place({ id: 'osm:node/42', cuisines: ['italian'] });
    expect(pickPlaceholder(p, fullManifest, BASE)).toEqual(pickPlaceholder(p, fullManifest, BASE));
    expect(pickPlaceholder(p, fullManifest, BASE)!.uri).toMatch(
      /^\/Tablefinder\/placeholders\/italian-\d\.webp$/,
    );
  });

  it('verteilt gleiche Küchen auf verschiedene Varianten', () => {
    const files = new Set(
      Array.from(
        { length: 60 },
        (_, i) =>
          pickPlaceholder(
            place({ id: `osm:node/${i}`, cuisines: ['italian'] }),
            fullManifest,
            BASE,
          )!.uri,
      ),
    );
    expect(files.size).toBeGreaterThanOrEqual(4);
  });

  it('Terrassen-Bilder nur für Lokale mit Außenplätzen', () => {
    const terrace = new Set(
      catalog.groups.italian.scenes
        .map((s, i) => (s.tags.includes('terrace') ? `italian-${i + 1}.webp` : null))
        .filter(Boolean),
    );
    for (let i = 0; i < 60; i++) {
      const p = place({
        id: `osm:way/${i}`,
        cuisines: ['italian'],
        attributes: { ...base.attributes, outdoorSeating: false },
      });
      const file = pickPlaceholder(p, fullManifest, BASE)!.uri.split('/').pop();
      expect(terrace.has(file!)).toBe(false);
    }
  });

  it('vegetarische Lokale bekommen häufig ein vegetarisches Motiv', () => {
    const veggie = (i: number) =>
      pickPlaceholder(
        place({
          id: `osm:node/v${i}`,
          cuisines: ['italian'],
          attributes: { ...base.attributes, vegetarian: true, outdoorSeating: false },
        }),
        fullManifest,
        BASE,
      )!.uri.endsWith('italian-5.webp');
    const count = Array.from({ length: 100 }, (_, i) => veggie(i)).filter(Boolean).length;
    expect(count).toBeGreaterThan(35);
  });

  it('fehlt eine Gruppe, gibt es ein allgemeines Restaurant-Bild', () => {
    const partial: PlaceholderManifest = {
      ...fullManifest,
      images: { restaurant: fullManifest.images.restaurant },
    };
    expect(pickPlaceholder(place({ cuisines: ['greek'] }), partial, BASE)!.uri).toContain(
      '/restaurant-',
    );
  });

  it('hashId ist stabil und verteilt', () => {
    expect(hashId('abc')).toBe(hashId('abc'));
    expect(hashId('abc')).not.toBe(hashId('abd'));
  });
});
