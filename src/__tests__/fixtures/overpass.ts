import type { OverpassElement } from '@/services/places/osm-types';

/**
 * Nachgebaute Overpass-Antwort (Format laut https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL,
 * `[out:json]` + `out center tags`). Keine echten Daten – die Overpass API war beim Bau nicht erreichbar.
 * Mittelpunkt der Tests: Kreuzberg (52.4986, 13.4203).
 */
export const OSM_RAMEN: OverpassElement = {
  type: 'node',
  id: 101,
  lat: 52.5009,
  lon: 13.4186,
  tags: {
    amenity: 'restaurant',
    name: 'Ramen Yokai',
    cuisine: 'ramen;japanese',
    'diet:vegan': 'yes',
    outdoor_seating: 'yes',
    'addr:street': 'Oranienstraße',
    'addr:housenumber': '12',
    'addr:postcode': '10999',
    'addr:city': 'Berlin',
    opening_hours: 'Tu-Su 12:00-22:30',
    website: 'ramen-yokai.example',
    phone: '+49 30 1234567',
  },
};

export const OSM_CAFE: OverpassElement = {
  type: 'way',
  id: 202,
  center: { lat: 52.499, lon: 13.421 },
  tags: {
    amenity: 'cafe',
    name: 'Café am Ufer',
    cuisine: 'coffee_shop;cake',
    'diet:vegetarian': 'yes',
    dog: 'yes',
    opening_hours: 'Mo-Fr 08:00-18:00; Sa,Su 09:00-18:00',
    'contact:website': 'https://cafe-ufer.example',
  },
};

export const OSM_KEBAB: OverpassElement = {
  type: 'node',
  id: 303,
  lat: 52.4975,
  lon: 13.4215,
  tags: {
    amenity: 'fast_food',
    name: 'Kebab Haus',
    cuisine: 'kebab',
    takeaway: 'only',
    'diet:vegan': 'no',
    opening_hours: '24/7',
  },
};

export const OSM_BAKERY: OverpassElement = {
  type: 'node',
  id: 404,
  lat: 52.4983,
  lon: 13.4199,
  tags: { shop: 'bakery', name: 'Backstube', opening_hours: 'Mo-Fr 06:00-18:00; PH off' },
};

export const OSM_PUB_ODD_HOURS: OverpassElement = {
  type: 'node',
  id: 505,
  lat: 52.4995,
  lon: 13.4225,
  tags: { amenity: 'pub', name: 'Eckkneipe', opening_hours: 'Mo-Su 18:00+' },
};

export const OSM_NO_NAME: OverpassElement = {
  type: 'node',
  id: 606,
  lat: 52.4987,
  lon: 13.4204,
  tags: { amenity: 'restaurant' },
};

/** ~3,4 km nördlich – außerhalb von 1,5 km */
export const OSM_FAR: OverpassElement = {
  type: 'node',
  id: 707,
  lat: 52.5295,
  lon: 13.4203,
  tags: { amenity: 'restaurant', name: 'Weit Weg', cuisine: 'italian' },
};

export const OSM_AREA = [
  OSM_RAMEN,
  OSM_CAFE,
  OSM_KEBAB,
  OSM_BAKERY,
  OSM_PUB_ODD_HOURS,
  OSM_NO_NAME,
  OSM_FAR,
];
