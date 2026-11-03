import { DISTRICTS } from '@/constants/districts';
import { EMPTY_ATTRIBUTES, type PlaceAttributes, type PlaceDetails } from '@/types/place';
import { parseOsmOpeningHours } from '@/utils/osm-opening-hours';
import { normalizeText } from '@/utils/text';

import type { OverpassElement } from './osm-types';

/** Interne ID: `osm:node:123`, `osm:way:456` … */
export function osmId(el: Pick<OverpassElement, 'type' | 'id'>): string {
  return `osm:${el.type}:${el.id}`;
}

export function parseOsmId(id: string): { type: OverpassElement['type']; id: number } | null {
  const m = /^osm:(node|way|relation):(\d+)$/.exec(id);
  return m ? { type: m[1] as OverpassElement['type'], id: Number(m[2]) } : null;
}

export function isOsmId(id: string): boolean {
  return id.startsWith('osm:');
}

type Cuisine = { label: string; type?: string; keywords?: string };

/** Häufige `cuisine`-Werte: deutsche Bezeichnung, passender Typ und zusätzliche Suchwörter. */
const CUISINES: Record<string, Cuisine> = {
  italian: { label: 'Italienisch', type: 'italian_restaurant', keywords: 'pasta' },
  pizza: { label: 'Pizza', type: 'pizza_restaurant' },
  vietnamese: { label: 'Vietnamesisch', type: 'vietnamese_restaurant', keywords: 'pho' },
  japanese: { label: 'Japanisch', type: 'japanese_restaurant' },
  sushi: { label: 'Sushi', type: 'sushi_restaurant' },
  ramen: { label: 'Ramen', type: 'ramen_restaurant', keywords: 'nudeln' },
  chinese: { label: 'Chinesisch', type: 'chinese_restaurant' },
  thai: { label: 'Thailändisch', type: 'thai_restaurant' },
  indian: { label: 'Indisch', type: 'indian_restaurant', keywords: 'curry' },
  korean: { label: 'Koreanisch', type: 'korean_restaurant' },
  asian: { label: 'Asiatisch', type: 'asian_restaurant' },
  turkish: { label: 'Türkisch', type: 'turkish_restaurant' },
  kebab: { label: 'Döner', keywords: 'kebab doener' },
  german: { label: 'Deutsch' },
  regional: { label: 'Regional' },
  greek: { label: 'Griechisch', type: 'greek_restaurant' },
  mexican: { label: 'Mexikanisch', type: 'mexican_restaurant' },
  lebanese: { label: 'Libanesisch', type: 'lebanese_restaurant' },
  arab: { label: 'Arabisch' },
  middle_eastern: { label: 'Orientalisch', type: 'middle_eastern_restaurant' },
  falafel: { label: 'Falafel' },
  burger: { label: 'Burger', type: 'hamburger_restaurant' },
  american: { label: 'Amerikanisch', type: 'american_restaurant' },
  french: { label: 'Französisch', type: 'french_restaurant' },
  spanish: { label: 'Spanisch', type: 'spanish_restaurant' },
  seafood: { label: 'Fisch', type: 'seafood_restaurant' },
  fish: { label: 'Fisch', type: 'seafood_restaurant' },
  steak_house: { label: 'Steakhaus', type: 'steak_house' },
  coffee_shop: { label: 'Kaffee', keywords: 'kaffee' },
  cake: { label: 'Kuchen' },
  ice_cream: { label: 'Eis' },
  breakfast: { label: 'Frühstück' },
  brunch: { label: 'Brunch', keywords: 'fruehstueck' },
  vegan: { label: 'Vegan' },
  vegetarian: { label: 'Vegetarisch' },
};

const AMENITY: Record<string, { label: string; type: string }> = {
  restaurant: { label: 'Restaurant', type: 'restaurant' },
  cafe: { label: 'Café', type: 'cafe' },
  bar: { label: 'Bar', type: 'bar' },
  pub: { label: 'Kneipe', type: 'pub' },
  biergarten: { label: 'Biergarten', type: 'bar' },
  fast_food: { label: 'Imbiss', type: 'fast_food_restaurant' },
  food_court: { label: 'Food Court', type: 'food_court' },
  ice_cream: { label: 'Eisdiele', type: 'ice_cream_shop' },
};

/** Für die Overpass-Abfrage: alle berücksichtigten `amenity`-Werte. */
export const OSM_AMENITIES = Object.keys(AMENITY);

const yesNo = (v: string | undefined): boolean | null => {
  if (v === undefined) return null;
  if (['yes', 'only', 'limited', 'leashed', 'outside'].includes(v)) return true;
  if (v === 'no') return false;
  return null;
};

function cuisinesOf(tags: Record<string, string>): string[] {
  return (tags.cuisine ?? '')
    .split(';')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

function cuisineLabel(value: string): string {
  const known = CUISINES[value];
  if (known) return known.label;
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function withScheme(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  return /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`;
}

/**
 * Wandelt ein OSM-Element in das App-Modell. `null`, wenn der Ort keinen Namen,
 * keine Koordinaten oder keine Gastronomie-Art hat.
 * `openNow` bleibt hier `null` und wird erst bei der Ausgabe aus den Zeiten berechnet.
 */
export function mapOsmElement(el: OverpassElement): PlaceDetails | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!name || lat === undefined || lon === undefined) return null;

  const isBakery = tags.shop === 'bakery';
  const amenity = isBakery ? undefined : AMENITY[tags.amenity ?? ''];
  if (!amenity && !isBakery) return null;

  const cuisines = cuisinesOf(tags);
  const specific = cuisines.map((c) => CUISINES[c]?.type).find(Boolean);
  let primaryType: string;
  if (isBakery) primaryType = 'bakery';
  else if (tags.amenity === 'fast_food' && tags.takeaway === 'only') primaryType = 'meal_takeaway';
  else if (tags.amenity === 'restaurant' && specific) primaryType = specific;
  else primaryType = amenity!.type;

  const baseLabel = isBakery ? 'Bäckerei' : amenity!.label;
  const labels = cuisines
    .filter((c) => !['vegan', 'vegetarian'].includes(c))
    .slice(0, 2)
    .map(cuisineLabel);
  const typeLabel = labels.length ? `${baseLabel} · ${labels.join(', ')}` : baseLabel;

  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = tags['addr:city'] ?? 'Berlin';
  const formattedAddress = street
    ? [street, [tags['addr:postcode'], city].filter(Boolean).join(' ')].join(', ')
    : null;

  const veganTag = yesNo(tags['diet:vegan']) ?? (cuisines.includes('vegan') ? true : null);
  const vegetarianTag =
    yesNo(tags['diet:vegetarian']) ??
    (cuisines.includes('vegetarian') || veganTag === true ? true : null);
  const attributes: PlaceAttributes = {
    ...EMPTY_ATTRIBUTES,
    vegetarian: vegetarianTag,
    vegan: veganTag,
    outdoorSeating: yesNo(tags.outdoor_seating),
    dogsAllowed: yesNo(tags.dog),
  };

  const hours = parseOsmOpeningHours(tags.opening_hours);
  const phone = tags.phone ?? tags['contact:phone'] ?? null;

  return {
    id: osmId(el),
    source: 'osm',
    name,
    primaryType,
    typeLabel,
    types: [...new Set([primaryType, isBakery ? 'bakery' : amenity!.type])],
    location: { latitude: lat, longitude: lon },
    shortAddress: street ? `${street}, ${city}` : null,
    rating: null,
    ratingCount: 0,
    priceLevel: null,
    openNow: null,
    businessStatus: 'operational',
    photo: null,
    attributes,
    formattedAddress,
    phone,
    internationalPhone: phone,
    website: withScheme(tags.website ?? tags['contact:website']),
    mapsUri: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    openingHours: hours ? { openNow: null, ...hours } : null,
    photos: [],
    reviews: [],
  };
}

/** Text, gegen den die Freitextsuche prüft (Name, Art, Küche, Diät, Straße). */
export function osmSearchText(place: PlaceDetails, el: OverpassElement): string {
  const tags = el.tags ?? {};
  const cuisines = cuisinesOf(tags);
  return normalizeText(
    [
      place.name,
      place.typeLabel ?? '',
      ...cuisines.map(
        (c) => `${c.replace(/_/g, ' ')} ${cuisineLabel(c)} ${CUISINES[c]?.keywords ?? ''}`,
      ),
      place.attributes.vegan ? 'vegan' : '',
      place.attributes.vegetarian ? 'vegetarisch vegetarian' : '',
      tags['addr:street'] ?? '',
      tags['addr:suburb'] ?? '',
    ].join(' '),
  );
}

/**
 * Ortsangaben im Suchtext („vegan Kreuzberg“) stehen in OSM selten am Lokal.
 * Sie werden daher nicht als Pflichtwort gewertet – den Ort wählt man über die Bezirks-Chips.
 */
const PLACE_WORDS = new Set(
  ['berlin', ...DISTRICTS.flatMap((d) => d.name.split(/\s+/))].map(normalizeText),
);

export function withoutPlaceWords(tokens: string[]): string[] {
  return tokens.filter((t) => !PLACE_WORDS.has(t));
}
