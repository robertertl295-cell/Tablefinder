import type { AttributeKey } from '@/types/filters';
import type { DataSource } from '@/types/place';

/** Was eine Datenquelle liefern kann – steuert Filter, Sortierung und Anzeige. */
export type SourceCapabilities = {
  /** Sterne und Anzahl Bewertungen */
  ratings: boolean;
  priceLevels: boolean;
  photos: boolean;
  reviews: boolean;
  /** Filterbare Angebots-Merkmale */
  attributes: readonly AttributeKey[];
  /** Frühstück / Mittag / Abendessen */
  meals: boolean;
};

const GOOGLE: SourceCapabilities = {
  ratings: true,
  priceLevels: true,
  photos: true,
  reviews: true,
  attributes: [
    'vegetarian',
    'outdoorSeating',
    'dogsAllowed',
    'wheelchair',
    'goodForGroups',
    'goodForChildren',
    'takeaway',
    'delivery',
    'reservable',
    'cards',
  ],
  meals: true,
};

export const SOURCE_CAPABILITIES: Record<DataSource, SourceCapabilities> = {
  google: GOOGLE,
  // Beispieldaten verhalten sich wie Google.
  mock: GOOGLE,
  osm: {
    ratings: false,
    priceLevels: false,
    photos: false,
    reviews: false,
    attributes: [
      'vegetarian',
      'vegan',
      'glutenFree',
      'halal',
      'outdoorSeating',
      'dogsAllowed',
      'wheelchair',
      'wifi',
      'smokeFree',
      'takeaway',
      'delivery',
      'reservable',
      'cards',
    ],
    meals: false,
  },
};

export const SOURCE_LABEL: Record<DataSource, string> = {
  google: 'Google Places',
  osm: 'OpenStreetMap',
  mock: 'Beispieldaten',
};
