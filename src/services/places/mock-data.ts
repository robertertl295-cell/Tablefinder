/**
 * Erfundene Beispieldaten für die Entwicklung ohne API-Key.
 * Namen und Adressen sind fiktiv; die Koordinaten liegen in den genannten Bezirken.
 * Enthält bewusst Sonderfälle: wenige Bewertungen, keine Bewertungen,
 * dauerhaft/vorübergehend geschlossen, fehlende Angaben.
 */
import {
  EMPTY_ATTRIBUTES,
  type OpeningHours,
  type OpeningPeriod,
  type PlaceAttributes,
  type PlaceDetails,
  type PriceLevel,
  type Review,
} from '@/types/place';

import { cuisinesFromTypes } from './mapping';

export type MockPlace = PlaceDetails & {
  /** Zusätzliche Suchbegriffe (Küche, Stichworte). */
  keywords: string[];
  district: string;
};

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

type Schedule = { days: number[]; open: string; close: string };

/** Erzeugt Öffnungszeiten im Google-Format (Montag zuerst). */
function hours(schedules: Schedule[], openNow: boolean | null): OpeningHours {
  const periods: OpeningPeriod[] = [];
  const byDay = new Map<number, string[]>();
  for (const s of schedules) {
    const [oh = 0, om = 0] = s.open.split(':').map(Number);
    const [ch = 0, cm = 0] = s.close.split(':').map(Number);
    for (const day of s.days) {
      const closeDay = ch < oh || (ch === oh && cm <= om) ? (day + 1) % 7 : day;
      periods.push({
        open: { day, hour: oh, minute: om },
        close: { day: closeDay, hour: ch, minute: cm },
      });
      byDay.set(day, [...(byDay.get(day) ?? []), `${s.open}–${s.close}`]);
    }
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  return {
    openNow,
    periods,
    weekdayDescriptions: order.map(
      (d) => `${WEEKDAYS[d]}: ${byDay.get(d)?.join(', ') ?? 'Geschlossen'}`,
    ),
  };
}

const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];
const TUE_SUN = [0, 2, 3, 4, 5, 6];
const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];

function review(
  id: string,
  authorName: string,
  rating: number,
  text: string,
  relativeTime: string,
): Review {
  return {
    id,
    authorName,
    authorUri: null,
    authorPhotoUri: null,
    rating,
    text,
    relativeTime,
    publishTime: null,
  };
}

type Input = {
  id: string;
  name: string;
  primaryType: string;
  typeLabel: string;
  types?: string[];
  district: string;
  street: string;
  postcode: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number;
  priceLevel: PriceLevel | null;
  openNow: boolean | null;
  schedules: Schedule[];
  attributes?: Partial<PlaceAttributes>;
  keywords: string[];
  phone?: string;
  website?: string;
  businessStatus?: PlaceDetails['businessStatus'];
  photoCount?: number;
  reviews?: Review[];
};

/** Zusätzliche Angaben zu Service und Ausstattung (wie Google sie liefern würde). */
const EXTRA: Record<string, Partial<PlaceAttributes>> = {
  'mock-ramen-kreuzberg': { takeaway: true, reservable: false, cards: true, wheelchair: false },
  'mock-vegan-kreuzberg': { takeaway: true, cards: true, wheelchair: true },
  'mock-cafe-mitte': { takeaway: true, cards: true, wheelchair: true },
  'mock-bakery-prenzlauer': { takeaway: true, cards: false },
  'mock-doener-kreuzberg': { takeaway: true, delivery: true, cards: false },
  'mock-italian-charlottenburg': {
    reservable: true,
    delivery: true,
    cards: true,
    wheelchair: true,
  },
  'mock-vietnamese-friedrichshain': { takeaway: true, delivery: true, cards: true },
  'mock-burger-friedrichshain': { takeaway: true, delivery: true, cards: true, wheelchair: true },
  'mock-fine-mitte': { reservable: true, cards: true, wheelchair: true },
  'mock-sushi-prenzlauer': { reservable: true, delivery: true, cards: true },
  'mock-lunch-mitte': { takeaway: true, cards: true },
  'mock-wine-schoeneberg': { reservable: true, cards: true },
};

function place(i: Input): MockPlace {
  const photos = Array.from({ length: i.photoCount ?? 3 }, (_, n) => ({
    name: `mock/${i.id}/${n}`,
    widthPx: 1200,
    heightPx: 800,
    attributions: [{ displayName: 'Beispielfoto', uri: null }],
  }));
  const formattedAddress = `${i.street}, ${i.postcode} Berlin, Deutschland`;
  return {
    id: i.id,
    name: i.name,
    primaryType: i.primaryType,
    typeLabel: i.typeLabel,
    types: i.types ?? [i.primaryType, 'food', 'point_of_interest', 'establishment'],
    location: { latitude: i.lat, longitude: i.lng },
    shortAddress: `${i.street}, Berlin`,
    rating: i.rating,
    ratingCount: i.ratingCount,
    priceLevel: i.priceLevel,
    openNow: i.openNow,
    businessStatus: i.businessStatus ?? 'operational',
    photo: photos[0] ?? null,
    attributes: { ...EMPTY_ATTRIBUTES, ...i.attributes, ...EXTRA[i.id] },
    source: 'mock',
    formattedAddress,
    phone: i.phone ?? null,
    internationalPhone: i.phone ? `+49 ${i.phone.replace(/^0/, '')}` : null,
    website: i.website ?? null,
    mapsUri: null,
    openingHours: i.schedules.length ? hours(i.schedules, i.openNow) : null,
    periods: i.schedules.length ? hours(i.schedules, i.openNow).periods : null,
    cuisines: cuisinesFromTypes(i.types ?? [i.primaryType]),
    photos,
    reviews: i.reviews ?? [],
    keywords: i.keywords,
    district: i.district,
  };
}

export const MOCK_PLACES: MockPlace[] = [
  place({
    id: 'mock-ramen-kreuzberg',
    name: 'Nudelwerk Ramen',
    primaryType: 'ramen_restaurant',
    typeLabel: 'Ramen-Restaurant',
    types: ['ramen_restaurant', 'japanese_restaurant', 'restaurant', 'food'],
    district: 'Kreuzberg',
    street: 'Oranienstraße 41',
    postcode: '10999',
    lat: 52.5009,
    lng: 13.4186,
    rating: 4.6,
    ratingCount: 1284,
    priceLevel: 2,
    openNow: true,
    schedules: [{ days: TUE_SUN, open: '12:00', close: '22:30' }],
    attributes: { vegetarian: true, goodForGroups: false, lunch: true, dinner: true },
    keywords: ['ramen', 'japanisch', 'nudeln', 'suppe', 'vegan'],
    phone: '030 12345601',
    website: 'https://example.com/nudelwerk',
    reviews: [
      review(
        'r1',
        'Mara K.',
        5,
        'Die vegane Miso-Ramen ist großartig, Brühe sehr tief.',
        'vor 2 Wochen',
      ),
      review('r2', 'Jonas', 4, 'Lecker, aber zur Stoßzeit lange Wartezeit.', 'vor einem Monat'),
      review('r3', 'S. Öztürk', 3, 'Gut, aber etwas salzig für meinen Geschmack.', 'vor 3 Monaten'),
    ],
  }),
  place({
    id: 'mock-vegan-kreuzberg',
    name: 'Grünzeug Küche',
    primaryType: 'vegan_restaurant',
    typeLabel: 'Veganes Restaurant',
    types: ['vegan_restaurant', 'vegetarian_restaurant', 'restaurant', 'food'],
    district: 'Kreuzberg',
    street: 'Wiener Straße 18',
    postcode: '10999',
    lat: 52.4985,
    lng: 13.4302,
    rating: 4.8,
    ratingCount: 22,
    priceLevel: 2,
    openNow: true,
    schedules: [{ days: MON_SAT, open: '11:30', close: '21:00' }],
    attributes: {
      vegetarian: true,
      outdoorSeating: true,
      dogsAllowed: true,
      goodForChildren: true,
      lunch: true,
      dinner: true,
    },
    keywords: ['vegan', 'vegetarisch', 'bowls', 'saisonal'],
    website: 'https://example.com/gruenzeug',
    reviews: [
      review('r1', 'Lena', 5, 'Kleiner Laden, wechselnde Karte, alles hausgemacht.', 'vor 5 Tagen'),
    ],
  }),
  place({
    id: 'mock-cafe-mitte',
    name: 'Café Morgenlicht',
    primaryType: 'cafe',
    typeLabel: 'Café',
    types: ['cafe', 'coffee_shop', 'food'],
    district: 'Mitte',
    street: 'Torstraße 102',
    postcode: '10119',
    lat: 52.5297,
    lng: 13.4019,
    rating: 4.4,
    ratingCount: 642,
    priceLevel: 1,
    openNow: true,
    schedules: [
      { days: MON_FRI, open: '08:00', close: '18:00' },
      { days: [0, 6], open: '09:00', close: '18:00' },
    ],
    attributes: {
      vegetarian: true,
      outdoorSeating: true,
      dogsAllowed: true,
      breakfast: true,
      lunch: true,
      dinner: false,
    },
    keywords: ['frühstück', 'kaffee', 'brunch', 'kuchen', 'flat white'],
    phone: '030 12345602',
    reviews: [
      review(
        'r1',
        'Tom',
        5,
        'Bester Flat White in Mitte, Frühstück bis 15 Uhr.',
        'vor einer Woche',
      ),
      review('r2', 'Ayşe', 4, 'Gemütlich, am Wochenende voll.', 'vor 2 Monaten'),
    ],
  }),
  place({
    id: 'mock-bakery-prenzlauer',
    name: 'Bäckerei Krume',
    primaryType: 'bakery',
    typeLabel: 'Bäckerei',
    types: ['bakery', 'food', 'store'],
    district: 'Prenzlauer Berg',
    street: 'Kastanienallee 7',
    postcode: '10435',
    lat: 52.5372,
    lng: 13.4087,
    rating: 4.7,
    ratingCount: 389,
    priceLevel: 1,
    openNow: false,
    schedules: [{ days: MON_SAT, open: '07:00', close: '14:00' }],
    attributes: { vegetarian: true, breakfast: true },
    keywords: ['sauerteig', 'brot', 'croissant', 'franzbrötchen'],
  }),
  place({
    id: 'mock-bar-neukoelln',
    name: 'Die Kurve',
    primaryType: 'bar',
    typeLabel: 'Bar',
    types: ['bar', 'point_of_interest'],
    district: 'Neukölln',
    street: 'Weserstraße 55',
    postcode: '12045',
    lat: 52.4871,
    lng: 13.4364,
    rating: 4.3,
    ratingCount: 517,
    priceLevel: 2,
    openNow: false,
    schedules: [{ days: ALL_WEEK, open: '19:00', close: '03:00' }],
    attributes: { outdoorSeating: true, goodForGroups: true, dogsAllowed: true },
    keywords: ['cocktails', 'kneipe', 'drinks', 'spät'],
  }),
  place({
    id: 'mock-wine-schoeneberg',
    name: 'Rebstock Weinbar',
    primaryType: 'wine_bar',
    typeLabel: 'Weinbar',
    types: ['wine_bar', 'bar', 'point_of_interest'],
    district: 'Schöneberg',
    street: 'Goltzstraße 30',
    postcode: '10781',
    lat: 52.4942,
    lng: 13.3537,
    rating: 4.5,
    ratingCount: 143,
    priceLevel: 3,
    openNow: true,
    schedules: [{ days: [2, 3, 4, 5, 6], open: '17:00', close: '00:00' }],
    attributes: { vegetarian: true, outdoorSeating: true, dinner: true },
    keywords: ['wein', 'naturwein', 'käse', 'date'],
    reviews: [
      review('r1', 'Paul R.', 5, 'Gute Beratung, kleine Teller zum Teilen.', 'vor 3 Wochen'),
    ],
  }),
  place({
    id: 'mock-doener-kreuzberg',
    name: 'Kebab am Kanal',
    primaryType: 'meal_takeaway',
    typeLabel: 'Imbiss',
    types: ['meal_takeaway', 'turkish_restaurant', 'restaurant', 'food'],
    district: 'Kreuzberg',
    street: 'Kottbusser Damm 3',
    postcode: '10967',
    lat: 52.4954,
    lng: 13.4215,
    rating: 4.2,
    ratingCount: 2310,
    priceLevel: 1,
    openNow: true,
    schedules: [{ days: ALL_WEEK, open: '10:00', close: '02:00' }],
    attributes: { vegetarian: true, lunch: true, dinner: true, goodForGroups: true },
    keywords: ['döner', 'kebab', 'türkisch', 'günstig', 'streetfood'],
  }),
  place({
    id: 'mock-italian-charlottenburg',
    name: 'Trattoria Lino',
    primaryType: 'italian_restaurant',
    typeLabel: 'Italienisches Restaurant',
    types: ['italian_restaurant', 'pizza_restaurant', 'restaurant', 'food'],
    district: 'Charlottenburg',
    street: 'Savignyplatz 4',
    postcode: '10623',
    lat: 52.5056,
    lng: 13.3216,
    rating: 4.1,
    ratingCount: 876,
    priceLevel: 3,
    openNow: true,
    schedules: [{ days: ALL_WEEK, open: '12:00', close: '23:00' }],
    attributes: {
      vegetarian: true,
      outdoorSeating: true,
      goodForChildren: true,
      goodForGroups: true,
      lunch: true,
      dinner: true,
    },
    keywords: ['pasta', 'pizza', 'italienisch', 'wein', 'familie'],
    phone: '030 12345603',
    website: 'https://example.com/lino',
  }),
  place({
    id: 'mock-vietnamese-friedrichshain',
    name: 'Phở Ngon',
    primaryType: 'vietnamese_restaurant',
    typeLabel: 'Vietnamesisches Restaurant',
    types: ['vietnamese_restaurant', 'asian_restaurant', 'restaurant', 'food'],
    district: 'Friedrichshain',
    street: 'Simon-Dach-Straße 12',
    postcode: '10245',
    lat: 52.5101,
    lng: 13.4573,
    rating: 4.5,
    ratingCount: 958,
    priceLevel: 1,
    openNow: true,
    schedules: [{ days: ALL_WEEK, open: '11:00', close: '22:00' }],
    attributes: { vegetarian: true, outdoorSeating: true, lunch: true, dinner: true },
    keywords: ['pho', 'vietnamesisch', 'suppe', 'bowls', 'vegan'],
  }),
  place({
    id: 'mock-burger-friedrichshain',
    name: 'Patty Brothers',
    primaryType: 'fast_food_restaurant',
    typeLabel: 'Fast-Food-Restaurant',
    types: ['fast_food_restaurant', 'hamburger_restaurant', 'restaurant', 'food'],
    district: 'Friedrichshain',
    street: 'Warschauer Straße 60',
    postcode: '10243',
    lat: 52.5069,
    lng: 13.4498,
    rating: 3.9,
    ratingCount: 1540,
    priceLevel: 1,
    openNow: true,
    schedules: [{ days: ALL_WEEK, open: '11:30', close: '23:30' }],
    attributes: {
      vegetarian: true,
      goodForGroups: true,
      goodForChildren: true,
      lunch: true,
      dinner: true,
    },
    keywords: ['burger', 'pommes', 'schnell', 'streetfood'],
  }),
  place({
    id: 'mock-fine-mitte',
    name: 'Ufer Restaurant',
    primaryType: 'fine_dining_restaurant',
    typeLabel: 'Gehobenes Restaurant',
    types: ['fine_dining_restaurant', 'restaurant', 'food'],
    district: 'Mitte',
    street: 'Schiffbauerdamm 9',
    postcode: '10117',
    lat: 52.5205,
    lng: 13.3832,
    rating: 4.9,
    ratingCount: 12,
    priceLevel: 4,
    openNow: false,
    schedules: [{ days: [3, 4, 5, 6], open: '18:30', close: '23:00' }],
    attributes: { vegetarian: true, dinner: true, goodForChildren: false },
    keywords: ['menü', 'gehoben', 'date', 'regional'],
    website: 'https://example.com/ufer',
    reviews: [review('r1', 'Kai', 5, 'Ein Erlebnis – aber nichts für jeden Tag.', 'vor 2 Monaten')],
  }),
  place({
    id: 'mock-new-wedding',
    name: 'Imbiss Neue Mitte',
    primaryType: 'restaurant',
    typeLabel: 'Restaurant',
    types: ['restaurant', 'food'],
    district: 'Wedding',
    street: 'Müllerstraße 140',
    postcode: '13353',
    lat: 52.5468,
    lng: 13.3591,
    rating: null,
    ratingCount: 0,
    priceLevel: null,
    openNow: null,
    schedules: [],
    keywords: ['neu', 'mittagstisch'],
    photoCount: 0,
  }),
  place({
    id: 'mock-closed-moabit',
    name: 'Zum Alten Fass',
    primaryType: 'pub',
    typeLabel: 'Kneipe',
    types: ['pub', 'bar', 'point_of_interest'],
    district: 'Moabit',
    street: 'Turmstraße 22',
    postcode: '10559',
    lat: 52.5264,
    lng: 13.3412,
    rating: 4.0,
    ratingCount: 201,
    priceLevel: 1,
    openNow: false,
    businessStatus: 'closed_permanently',
    schedules: [],
    attributes: { goodForGroups: true },
    keywords: ['kneipe', 'bier', 'fußball'],
  }),
  place({
    id: 'mock-tempclosed-kreuzberg',
    name: 'Sonnendeck Café',
    primaryType: 'cafe',
    typeLabel: 'Café',
    types: ['cafe', 'food'],
    district: 'Kreuzberg',
    street: 'Paul-Lincke-Ufer 21',
    postcode: '10999',
    lat: 52.4943,
    lng: 13.4265,
    rating: 4.6,
    ratingCount: 87,
    priceLevel: 2,
    openNow: false,
    businessStatus: 'closed_temporarily',
    schedules: [{ days: ALL_WEEK, open: '09:00', close: '19:00' }],
    attributes: { outdoorSeating: true, breakfast: true, dogsAllowed: true, vegetarian: true },
    keywords: ['kanal', 'frühstück', 'kaffee', 'terrasse'],
  }),
  place({
    id: 'mock-sushi-prenzlauer',
    name: 'Sushi Kawa',
    primaryType: 'sushi_restaurant',
    typeLabel: 'Sushi-Restaurant',
    types: ['sushi_restaurant', 'japanese_restaurant', 'restaurant', 'food'],
    district: 'Prenzlauer Berg',
    street: 'Stargarder Straße 70',
    postcode: '10437',
    lat: 52.5487,
    lng: 13.4133,
    rating: 4.4,
    ratingCount: 410,
    priceLevel: 3,
    openNow: true,
    schedules: [{ days: TUE_SUN, open: '17:00', close: '22:30' }],
    attributes: { vegetarian: true, dinner: true, goodForChildren: true },
    keywords: ['sushi', 'japanisch', 'fisch', 'date'],
  }),
  place({
    id: 'mock-icecream-neukoelln',
    name: 'Eisdiele Kalt & Süß',
    primaryType: 'ice_cream_shop',
    typeLabel: 'Eisdiele',
    types: ['ice_cream_shop', 'food', 'store'],
    district: 'Neukölln',
    street: 'Hobrechtstraße 19',
    postcode: '12047',
    lat: 52.4925,
    lng: 13.4248,
    rating: 4.7,
    ratingCount: 29,
    priceLevel: 1,
    openNow: true,
    schedules: [{ days: ALL_WEEK, open: '12:00', close: '21:00' }],
    attributes: { vegetarian: true, dogsAllowed: true, goodForChildren: true },
    keywords: ['eis', 'sorbet', 'vegan', 'dessert'],
  }),
  place({
    id: 'mock-lunch-mitte',
    name: 'Mittagstisch Spree',
    primaryType: 'restaurant',
    typeLabel: 'Restaurant',
    types: ['restaurant', 'food'],
    district: 'Mitte',
    street: 'Rosenthaler Straße 40',
    postcode: '10178',
    lat: 52.5245,
    lng: 13.4021,
    rating: 4.2,
    ratingCount: 312,
    priceLevel: 2,
    openNow: true,
    schedules: [{ days: MON_FRI, open: '11:30', close: '15:30' }],
    attributes: { vegetarian: true, lunch: true, dinner: false, goodForGroups: true },
    keywords: ['mittag', 'mittagstisch', 'deutsch', 'saisonal', 'uni'],
  }),
  place({
    id: 'mock-hotel-mitte',
    // Kein Gastronomiebetrieb im Sinne der App – muss herausgefiltert werden.
    name: 'Hotel Am Alex',
    primaryType: 'hotel',
    typeLabel: 'Hotel',
    types: ['hotel', 'lodging', 'restaurant'],
    district: 'Mitte',
    street: 'Alexanderstraße 1',
    postcode: '10178',
    lat: 52.5214,
    lng: 13.4156,
    rating: 4.0,
    ratingCount: 3000,
    priceLevel: 3,
    openNow: true,
    schedules: [],
    keywords: ['frühstück', 'restaurant'],
  }),
];
