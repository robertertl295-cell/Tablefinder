/** Rohformate der Google Places API (New), nur die genutzten Felder. */

export type GLocalizedText = { text?: string; languageCode?: string };

export type GAuthorAttribution = { displayName?: string; uri?: string; photoUri?: string };

export type GPhoto = {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: GAuthorAttribution[];
};

export type GPoint = { day?: number; hour?: number; minute?: number };

export type GPeriod = { open?: GPoint; close?: GPoint };

export type GOpeningHours = {
  openNow?: boolean;
  periods?: GPeriod[];
  weekdayDescriptions?: string[];
};

export type GReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: GLocalizedText;
  originalText?: GLocalizedText;
  authorAttribution?: GAuthorAttribution;
  publishTime?: string;
};

export type GPriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export type GBusinessStatus =
  'BUSINESS_STATUS_UNSPECIFIED' | 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

export type GPlace = {
  id?: string;
  displayName?: GLocalizedText;
  primaryType?: string;
  primaryTypeDisplayName?: GLocalizedText;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: GPriceLevel;
  businessStatus?: GBusinessStatus;
  currentOpeningHours?: GOpeningHours;
  regularOpeningHours?: GOpeningHours;
  photos?: GPhoto[];
  reviews?: GReview[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  servesVegetarianFood?: boolean;
  outdoorSeating?: boolean;
  allowsDogs?: boolean;
  goodForGroups?: boolean;
  goodForChildren?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  reservable?: boolean;
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleSeating?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleParking?: boolean;
  };
  paymentOptions?: {
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsCashOnly?: boolean;
    acceptsNfc?: boolean;
  };
};

export type GSearchResponse = { places?: GPlace[]; nextPageToken?: string };

export type GErrorBody = { error?: { code?: number; message?: string; status?: string } };
