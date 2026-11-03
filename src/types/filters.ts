import type { PlaceCategory, PriceLevel } from './place';

/** Angebots-Merkmale, nach denen gefiltert werden kann. Welche verfügbar sind, hängt von der Quelle ab. */
export type AttributeKey =
  'vegetarian' | 'vegan' | 'outdoorSeating' | 'dogsAllowed' | 'goodForGroups' | 'goodForChildren';

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
};
