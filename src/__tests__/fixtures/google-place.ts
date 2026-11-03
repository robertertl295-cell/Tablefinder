import type { GPlace } from '@/services/places/google-types';

/** Vollständiger Google-Ort als Testvorlage. */
export const FULL_PLACE: GPlace = {
  id: 'ChIJabc',
  displayName: { text: 'Testlokal', languageCode: 'de' },
  primaryType: 'ramen_restaurant',
  primaryTypeDisplayName: { text: 'Ramen-Restaurant' },
  types: ['ramen_restaurant', 'restaurant', 'food'],
  location: { latitude: 52.5, longitude: 13.42 },
  shortFormattedAddress: 'Oranienstraße 1, Berlin',
  formattedAddress: 'Oranienstraße 1, 10999 Berlin, Deutschland',
  rating: 4.6,
  userRatingCount: 120,
  priceLevel: 'PRICE_LEVEL_MODERATE',
  businessStatus: 'OPERATIONAL',
  currentOpeningHours: {
    openNow: true,
    weekdayDescriptions: ['Montag: 12:00–22:00'],
    periods: [{ open: { day: 1, hour: 12, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } }],
  },
  photos: [
    {
      name: 'places/ChIJabc/photos/p1',
      widthPx: 800,
      heightPx: 600,
      authorAttributions: [{ displayName: 'Ana', uri: 'https://maps.google.com/ana' }],
    },
    { name: 'places/ChIJabc/photos/p2' },
  ],
  reviews: [
    {
      name: 'places/ChIJabc/reviews/r1',
      rating: 5,
      text: { text: 'Super' },
      relativePublishTimeDescription: 'vor einer Woche',
      authorAttribution: { displayName: 'Ben', uri: 'https://maps.google.com/ben' },
      publishTime: '2026-10-01T12:00:00Z',
    },
  ],
  nationalPhoneNumber: '030 123456',
  internationalPhoneNumber: '+49 30 123456',
  websiteUri: 'https://example.com',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  servesVegetarianFood: true,
  outdoorSeating: false,
};
