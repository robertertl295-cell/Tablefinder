import type {
  Attribution,
  BusinessStatus,
  DayTime,
  OpeningHours,
  OpeningPeriod,
  PhotoRef,
  PlaceAttributes,
  PlaceDetails,
  PlaceSummary,
  PriceLevel,
  Review,
} from '@/types/place';

import { PlacesError } from './errors';
import type {
  GAuthorAttribution,
  GBusinessStatus,
  GOpeningHours,
  GPhoto,
  GPlace,
  GPoint,
  GPriceLevel,
  GReview,
} from './google-types';

const PRICE_LEVEL: Partial<Record<GPriceLevel, PriceLevel>> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export const PRICE_LEVEL_TO_GOOGLE: Record<PriceLevel, GPriceLevel> = {
  1: 'PRICE_LEVEL_INEXPENSIVE',
  2: 'PRICE_LEVEL_MODERATE',
  3: 'PRICE_LEVEL_EXPENSIVE',
  4: 'PRICE_LEVEL_VERY_EXPENSIVE',
};

const BUSINESS_STATUS: Record<GBusinessStatus, BusinessStatus> = {
  BUSINESS_STATUS_UNSPECIFIED: 'unknown',
  OPERATIONAL: 'operational',
  CLOSED_TEMPORARILY: 'closed_temporarily',
  CLOSED_PERMANENTLY: 'closed_permanently',
};

const str = (v: string | undefined): string | null => (v && v.trim() ? v : null);
const bool = (v: boolean | undefined): boolean | null => (typeof v === 'boolean' ? v : null);

export function mapPriceLevel(value: GPriceLevel | undefined): PriceLevel | null {
  return value ? (PRICE_LEVEL[value] ?? null) : null;
}

function mapAttribution(a: GAuthorAttribution): Attribution | null {
  const displayName = str(a.displayName);
  return displayName ? { displayName, uri: str(a.uri) } : null;
}

export function mapPhoto(photo: GPhoto): PhotoRef {
  return {
    name: photo.name,
    widthPx: photo.widthPx ?? null,
    heightPx: photo.heightPx ?? null,
    attributions: (photo.authorAttributions ?? [])
      .map(mapAttribution)
      .filter((a): a is Attribution => a !== null),
  };
}

/** Karte möglich, wenn eine Kartenart ausdrücklich angenommen wird; „nur bar“ = nein. */
function cardsAccepted(o: GPlace['paymentOptions']): boolean | null {
  if (!o) return null;
  if (o.acceptsCreditCards || o.acceptsDebitCards || o.acceptsNfc) return true;
  if (o.acceptsCashOnly) return false;
  if (o.acceptsCreditCards === false && o.acceptsDebitCards === false) return false;
  return null;
}

function mapAttributes(p: GPlace): PlaceAttributes {
  return {
    vegetarian: bool(p.servesVegetarianFood),
    vegan: null, // kennt die Places API nicht
    outdoorSeating: bool(p.outdoorSeating),
    dogsAllowed: bool(p.allowsDogs),
    goodForGroups: bool(p.goodForGroups),
    goodForChildren: bool(p.goodForChildren),
    glutenFree: null, // kennt die Places API nicht
    halal: null,
    wheelchair: bool(p.accessibilityOptions?.wheelchairAccessibleEntrance),
    wifi: null,
    takeaway: bool(p.takeout),
    delivery: bool(p.delivery),
    reservable: bool(p.reservable),
    cards: cardsAccepted(p.paymentOptions),
    smokeFree: null,
    breakfast: bool(p.servesBreakfast),
    lunch: bool(p.servesLunch),
    dinner: bool(p.servesDinner),
  };
}

/** Wandelt einen Google-Ort in eine Ergebniskarte um. Wirft, wenn Pflichtfelder fehlen. */
export function mapPlaceSummary(p: GPlace): PlaceSummary {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!p.id || lat === undefined || lng === undefined) {
    throw new PlacesError('unknown', 'Ort ohne ID oder Koordinaten erhalten');
  }
  const firstPhoto = p.photos?.[0];
  return {
    id: p.id,
    source: 'google',
    name: str(p.displayName?.text) ?? 'Unbenannter Ort',
    primaryType: str(p.primaryType),
    typeLabel: str(p.primaryTypeDisplayName?.text),
    types: p.types ?? [],
    location: { latitude: lat, longitude: lng },
    shortAddress: str(p.shortFormattedAddress) ?? str(p.formattedAddress),
    rating: typeof p.rating === 'number' ? p.rating : null,
    ratingCount: p.userRatingCount ?? 0,
    priceLevel: mapPriceLevel(p.priceLevel),
    openNow: bool(p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow),
    businessStatus: p.businessStatus ? BUSINESS_STATUS[p.businessStatus] : 'unknown',
    photo: firstPhoto ? mapPhoto(firstPhoto) : null,
    attributes: mapAttributes(p),
    periods: periodsOf(p),
    cuisines: cuisinesFromTypes(p.types ?? []),
  };
}

/** Typen, die keine Küche, sondern eine Art oder Mahlzeit beschreiben. */
const NOT_A_CUISINE = new Set([
  'fast_food',
  'fine_dining',
  'vegan',
  'vegetarian',
  'breakfast',
  'brunch',
  'dessert',
  'buffet',
]);

/** Google-Typen → Küchen: `italian_restaurant` → `italian`. */
export function cuisinesFromTypes(types: readonly string[]): string[] {
  const out = new Set<string>();
  for (const t of types) {
    if (!t.endsWith('_restaurant')) continue;
    const c = t.slice(0, -'_restaurant'.length);
    if (c && !NOT_A_CUISINE.has(c)) out.add(c);
  }
  return [...out];
}

function periodsOf(p: GPlace): OpeningPeriod[] | null {
  const hours = mapOpeningHours(p.currentOpeningHours ?? p.regularOpeningHours);
  return hours && hours.periods.length ? hours.periods : null;
}

function mapPoint(point: GPoint | undefined): DayTime | null {
  if (!point || point.day === undefined) return null;
  return { day: point.day, hour: point.hour ?? 0, minute: point.minute ?? 0 };
}

export function mapOpeningHours(hours: GOpeningHours | undefined): OpeningHours | null {
  if (!hours) return null;
  const periods: OpeningPeriod[] = [];
  for (const period of hours.periods ?? []) {
    const open = mapPoint(period.open);
    if (open) periods.push({ open, close: mapPoint(period.close) });
  }
  return {
    openNow: bool(hours.openNow),
    weekdayDescriptions: hours.weekdayDescriptions ?? [],
    periods,
  };
}

function mapReview(r: GReview, index: number): Review {
  return {
    id: r.name ?? `review-${index}`,
    authorName: str(r.authorAttribution?.displayName) ?? 'Anonym',
    authorUri: str(r.authorAttribution?.uri),
    authorPhotoUri: str(r.authorAttribution?.photoUri),
    rating: typeof r.rating === 'number' ? r.rating : null,
    text: str(r.text?.text) ?? str(r.originalText?.text),
    relativeTime: str(r.relativePublishTimeDescription),
    publishTime: str(r.publishTime),
  };
}

/**
 * Neueste zuerst. Google liefert bis zu 5 Rezensionen nach Relevanz;
 * ohne Datum bleiben sie in der gelieferten Reihenfolge am Ende.
 */
export function sortReviewsNewestFirst(reviews: Review[]): Review[] {
  const time = (r: Review) => (r.publishTime ? Date.parse(r.publishTime) : Number.NaN);
  return reviews
    .map((r, i) => ({ r, i, t: time(r) }))
    .sort((a, b) => {
      const aHas = !Number.isNaN(a.t);
      const bHas = !Number.isNaN(b.t);
      if (aHas && bHas && a.t !== b.t) return b.t - a.t;
      if (aHas !== bHas) return aHas ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ r }) => r);
}

export function mapPlaceDetails(p: GPlace): PlaceDetails {
  const summary = mapPlaceSummary(p);
  // currentOpeningHours enthält Sonderöffnungszeiten der nächsten 7 Tage, regular ist der Fallback.
  const hours = mapOpeningHours(p.currentOpeningHours ?? p.regularOpeningHours);
  return {
    ...summary,
    openNow: hours?.openNow ?? summary.openNow,
    formattedAddress: str(p.formattedAddress),
    phone: str(p.nationalPhoneNumber),
    internationalPhone: str(p.internationalPhoneNumber),
    website: str(p.websiteUri),
    mapsUri: str(p.googleMapsUri),
    openingHours: hours,
    photos: (p.photos ?? []).map(mapPhoto),
    reviews: sortReviewsNewestFirst((p.reviews ?? []).map(mapReview)),
  };
}
