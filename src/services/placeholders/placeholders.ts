import { config } from '@/services/config';
import type { PlaceSummary } from '@/types/place';

import manifestJson from './manifest.json';

/**
 * KI-Symbolbilder für Lokale ohne eigenes Foto (vor allem OpenStreetMap).
 * Erzeugt von scripts/generate-placeholders.mjs, ausgeliefert unter public/placeholders/.
 * Jedes Lokal bekommt anhand seiner ID immer dieselbe Variante seines Typs – so sehen
 * benachbarte Lokale gleicher Küche verschieden aus, aber jedes Lokal bleibt wiedererkennbar.
 */
export type PlaceholderGroup =
  | 'pizza'
  | 'italian'
  | 'japanese'
  | 'vietnamese'
  | 'thai'
  | 'chinese'
  | 'korean'
  | 'asian'
  | 'indian'
  | 'turkish'
  | 'middle_eastern'
  | 'german'
  | 'burger'
  | 'mexican'
  | 'greek'
  | 'restaurant'
  | 'cafe'
  | 'bakery'
  | 'bar'
  | 'pub'
  | 'biergarten'
  | 'ice_cream'
  | 'imbiss';

export const PLACEHOLDER_GROUPS: readonly PlaceholderGroup[] = [
  'pizza',
  'italian',
  'japanese',
  'vietnamese',
  'thai',
  'chinese',
  'korean',
  'asian',
  'indian',
  'turkish',
  'middle_eastern',
  'german',
  'burger',
  'mexican',
  'greek',
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'pub',
  'biergarten',
  'ice_cream',
  'imbiss',
];

export type PlaceholderImage = { file: string; tags: string[] };
export type PlaceholderManifest = {
  version: number;
  generator: string | null;
  images: Partial<Record<PlaceholderGroup, PlaceholderImage[]>>;
};

export type Placeholder = { uri: string; group: PlaceholderGroup };

/** OSM-Küchen → Bildgruppe. Reihenfolge zählt: spezifisch vor allgemein. */
const CUISINE_TO_GROUP: [PlaceholderGroup, readonly string[]][] = [
  ['pizza', ['pizza']],
  ['japanese', ['japanese', 'sushi', 'ramen']],
  ['vietnamese', ['vietnamese']],
  ['thai', ['thai']],
  ['korean', ['korean']],
  ['chinese', ['chinese', 'dumpling', 'cantonese', 'sichuan']],
  ['indian', ['indian', 'pakistani', 'nepalese', 'sri_lankan']],
  ['turkish', ['turkish', 'kebab']],
  [
    'middle_eastern',
    ['middle_eastern', 'lebanese', 'arab', 'falafel', 'syrian', 'persian', 'israeli'],
  ],
  ['greek', ['greek']],
  ['mexican', ['mexican', 'tex-mex', 'tacos', 'burrito']],
  ['burger', ['burger', 'hamburger']],
  ['italian', ['italian']],
  ['german', ['german', 'regional', 'bavarian', 'schnitzel', 'currywurst']],
  ['asian', ['asian', 'indonesian', 'noodle', 'poke', 'filipino', 'malaysian']],
  ['ice_cream', ['ice_cream', 'frozen_yogurt']],
  ['cafe', ['coffee_shop', 'cake', 'breakfast']],
];

/** Google-Typen und Kategorien → Bildgruppe (wenn die Küche nichts hergibt). */
const TYPE_TO_GROUP: Record<string, PlaceholderGroup> = {
  ice_cream_shop: 'ice_cream',
  bakery: 'bakery',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  pub: 'pub',
  bar: 'bar',
  wine_bar: 'bar',
  fast_food_restaurant: 'imbiss',
  meal_takeaway: 'imbiss',
  food_court: 'imbiss',
  restaurant: 'restaurant',
};

export function placeholderGroup(place: PlaceSummary): PlaceholderGroup {
  if (place.typeLabel === 'Biergarten') return 'biergarten';
  // Eisdiele, Bäckerei & Co. vor der Küche: Ein Eiscafé mit cuisine=italian bleibt eine Eisdiele.
  for (const type of [place.primaryType, ...place.types]) {
    if (type === 'ice_cream_shop' || type === 'bakery') return TYPE_TO_GROUP[type]!;
  }
  const cuisines = place.cuisines.map((c) => c.toLowerCase());
  for (const [group, keys] of CUISINE_TO_GROUP) {
    if (cuisines.some((c) => keys.includes(c))) return group;
  }
  // Google-Typen wie „italian_restaurant“, „sushi_restaurant“
  for (const type of [place.primaryType, ...place.types]) {
    if (!type) continue;
    const base = type.replace(/_restaurant$/, '');
    for (const [group, keys] of CUISINE_TO_GROUP) if (keys.includes(base)) return group;
    const mapped = TYPE_TO_GROUP[type];
    if (mapped) return mapped;
  }
  return 'restaurant';
}

/** FNV-1a: schneller, stabiler Hash – gleiche ID → gleiche Variante, auf jedem Gerät. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Bevorzugte Bild-Tags: Außenplätze → Terrasse, vegetarisch/vegan → Gemüse. */
function preferredTag(place: PlaceSummary): string | null {
  const h = hashId(`${place.id}#tag`);
  if (place.attributes.vegan || place.attributes.vegetarian) {
    // Nicht immer: sonst sähen alle vegetarischen Lokale gleich aus.
    if (h % 2 === 0) return 'veggie';
  }
  if (place.attributes.outdoorSeating && h % 3 === 0) return 'terrace';
  return null;
}

export function pickPlaceholder(
  place: PlaceSummary,
  manifest: PlaceholderManifest,
  baseUrl: string | null,
): Placeholder | null {
  if (!baseUrl) return null;
  let group = placeholderGroup(place);
  let images = manifest.images[group];
  if (!images?.length) {
    group = 'restaurant';
    images = manifest.images.restaurant;
  }
  if (!images?.length) return null;
  // Terrassen-Szenen nur für Lokale mit Außenplätzen (bzw. Biergärten) – sonst irreführend.
  const outdoor = place.attributes.outdoorSeating === true || group === 'biergarten';
  const allowed = outdoor ? images : images.filter((img) => !img.tags.includes('terrace'));
  const pool = allowed.length ? allowed : images;
  const tag = preferredTag(place);
  const preferred = tag ? pool.filter((img) => img.tags.includes(tag)) : [];
  const candidates = preferred.length ? preferred : pool;
  const image = candidates[hashId(place.id) % candidates.length]!;
  return { uri: `${baseUrl.replace(/\/$/, '')}/${image.file}`, group };
}

const manifest = manifestJson as PlaceholderManifest;

/** Symbolbild für ein Lokal, oder `null`, wenn (noch) keine Bilder erzeugt wurden. */
export function placeholderFor(place: PlaceSummary): Placeholder | null {
  return pickPlaceholder(place, manifest, config.placeholderBaseUrl);
}

/** Erstes Symbolbild einer Gruppe (für Kacheln wie das Küchen-Karussell), oder `null`. */
export function groupImageUri(group: PlaceholderGroup): string | null {
  const image = manifest.images[group]?.[0];
  const base = config.placeholderBaseUrl;
  return image && base ? `${base.replace(/\/$/, '')}/${image.file}` : null;
}
