/**
 * Domänentypen der App – unabhängig vom Datenanbieter.
 * Fehlende Angaben sind `null` (Wert unbekannt), nie geraten.
 */

export type DataSource = 'google' | 'mock';

export type LatLng = {
  latitude: number;
  longitude: number;
};

/** Preisniveau 1 (günstig) bis 4 (sehr teuer). */
export type PriceLevel = 1 | 2 | 3 | 4;

export type BusinessStatus =
  'operational' | 'closed_temporarily' | 'closed_permanently' | 'unknown';

/** Grobe Kategorien, nach denen gefiltert werden kann. */
export type PlaceCategory = 'restaurant' | 'cafe' | 'bar' | 'bakery' | 'takeaway' | 'fast_food';

export type Attribution = {
  displayName: string;
  uri: string | null;
};

export type PhotoRef = {
  /** Anbieterspezifische Referenz (bei Google: `places/…/photos/…`). */
  name: string;
  widthPx: number | null;
  heightPx: number | null;
  attributions: Attribution[];
};

/** Angebots-Merkmale. `null` = Anbieter hat keine Angabe. */
export type PlaceAttributes = {
  vegetarian: boolean | null;
  outdoorSeating: boolean | null;
  dogsAllowed: boolean | null;
  goodForGroups: boolean | null;
  goodForChildren: boolean | null;
  breakfast: boolean | null;
  lunch: boolean | null;
  dinner: boolean | null;
};

export type PlaceSummary = {
  id: string;
  name: string;
  /** Technischer Typ, z. B. `ramen_restaurant`. */
  primaryType: string | null;
  /** Lesbarer Typ in der App-Sprache, z. B. „Ramen-Restaurant“. */
  typeLabel: string | null;
  types: string[];
  location: LatLng;
  shortAddress: string | null;
  rating: number | null;
  ratingCount: number;
  priceLevel: PriceLevel | null;
  openNow: boolean | null;
  businessStatus: BusinessStatus;
  photo: PhotoRef | null;
  attributes: PlaceAttributes;
};

export type DayTime = {
  /** 0 = Sonntag … 6 = Samstag */
  day: number;
  hour: number;
  minute: number;
};

export type OpeningPeriod = {
  open: DayTime;
  /** `null` = durchgehend geöffnet */
  close: DayTime | null;
};

export type OpeningHours = {
  openNow: boolean | null;
  /** Fertig formatierte Zeilen, z. B. „Montag: 12:00–22:00“, Montag zuerst. */
  weekdayDescriptions: string[];
  periods: OpeningPeriod[];
};

export type Review = {
  id: string;
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number | null;
  text: string | null;
  /** z. B. „vor 2 Wochen“ */
  relativeTime: string | null;
  publishTime: string | null;
};

export type PlaceDetails = PlaceSummary & {
  source: DataSource;
  formattedAddress: string | null;
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  mapsUri: string | null;
  openingHours: OpeningHours | null;
  photos: PhotoRef[];
  reviews: Review[];
};

export const EMPTY_ATTRIBUTES: PlaceAttributes = {
  vegetarian: null,
  outdoorSeating: null,
  dogsAllowed: null,
  goodForGroups: null,
  goodForChildren: null,
  breakfast: null,
  lunch: null,
  dinner: null,
};
