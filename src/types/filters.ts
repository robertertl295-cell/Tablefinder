import type { PlaceCategory, PriceLevel } from './place';

/** Angebots-Merkmale, nach denen gefiltert werden kann (alle von der Places API geliefert). */
export type AttributeKey =
  'vegetarian' | 'outdoorSeating' | 'dogsAllowed' | 'goodForGroups' | 'goodForChildren';

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
