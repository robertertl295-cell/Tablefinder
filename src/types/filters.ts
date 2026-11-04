import type { PlaceCategory, PriceLevel } from './place';

/** Angebots-Merkmale, nach denen gefiltert werden kann. Welche verfügbar sind, hängt von der Quelle ab. */
export type AttributeKey =
  | 'vegetarian'
  | 'vegan'
  | 'glutenFree'
  | 'halal'
  | 'outdoorSeating'
  | 'dogsAllowed'
  | 'wheelchair'
  | 'wifi'
  | 'smokeFree'
  | 'goodForGroups'
  | 'goodForChildren'
  | 'takeaway'
  | 'delivery'
  | 'reservable'
  | 'cards';

/** Küchenrichtungen (Gruppen über Google-Typen bzw. OSM `cuisine`). */
export type CuisineKey =
  | 'italian'
  | 'pizza'
  | 'asian'
  | 'japanese'
  | 'vietnamese'
  | 'indian'
  | 'turkish'
  | 'middleEastern'
  | 'german'
  | 'burger'
  | 'mexican'
  | 'greek';

/** Filter nach Öffnungszeiten (aus den Öffnungszeiträumen berechnet). */
export type HoursKey = 'lateOpen' | 'sundayOpen';

export type MealKey = 'breakfast' | 'lunch' | 'dinner';

export type Filters = {
  /** Leer = alle Arten. Mehrere = Lokal muss zu mindestens einer passen. */
  categories: PlaceCategory[];
  minRating: number | null;
  /** Mindestanzahl Bewertungen – gegen zufällig hohe Sterne mit dünner Datenbasis. */
  minRatingCount: number | null;
  /** Leer = alle Preisniveaus. */
  priceLevels: PriceLevel[];
  openNow: boolean;
  radiusMeters: number;
  /** Alle gewählten Merkmale müssen erfüllt sein. */
  attributes: AttributeKey[];
  /** Alle gewählten Mahlzeiten müssen angeboten werden. */
  meals: MealKey[];
  /** Leer = alle Küchen. Mehrere = Lokal muss zu mindestens einer passen. */
  cuisines: CuisineKey[];
  /** Alle gewählten Bedingungen müssen erfüllt sein. */
  hours: HoursKey[];
};
