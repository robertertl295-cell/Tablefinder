import { Platform as RNPlatform } from 'react-native';

import type { LatLng } from '@/types/place';

export type Platform = 'ios' | 'android' | 'web' | string;

/** Bevorzugte App für die Routenplanung (Einstellung). */
export type RouteApp = 'google' | 'system';

/**
 * Routenplanung in Google Maps. Auf dem iPhone/Android öffnet der Link die Google-Maps-App,
 * wenn sie installiert ist, sonst Google Maps im Browser. Die place_id (nur bei Google-Orten)
 * sorgt dafür, dass Google genau dieses Lokal als Ziel nimmt.
 */
export function googleDirectionsUrl(location: LatLng, placeId?: string | null): string {
  const coords = `${location.latitude},${location.longitude}`;
  const id = placeId ? `&destination_place_id=${encodeURIComponent(placeId)}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${coords}${id}`;
}

/**
 * Link, der eine Route zum Ort öffnet.
 * `app = 'google'`: immer Google Maps. `app = 'system'`: iOS Apple Maps, Android `geo:`
 * (das System bietet alle Karten-Apps an), sonst Google Maps im Browser.
 */
export function directionsUrl(
  platform: Platform,
  location: LatLng,
  name: string,
  app: RouteApp = 'system',
  placeId?: string | null,
): string {
  if (app === 'google') return googleDirectionsUrl(location, placeId);
  const coords = `${location.latitude},${location.longitude}`;
  if (platform === 'ios') {
    return `https://maps.apple.com/?daddr=${coords}&q=${encodeURIComponent(name)}`;
  }
  if (platform === 'android') {
    return `geo:${coords}?q=${coords}(${encodeURIComponent(name)})`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
}

/**
 * Plattform für Kartenlinks. Im Browser zählt das Gerät: Die Web-App auf dem iPhone
 * soll Apple Maps öffnen, nicht Google Maps im Browser.
 */
export function mapsPlatform(
  os: string = RNPlatform.OS,
  userAgent: string = globalThis.navigator?.userAgent ?? '',
): Platform {
  if (os !== 'web') return os;
  if (/iPhone|iPad|iPod|Macintosh/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'web';
}

/** `tel:`-Link ohne Leerzeichen und Trennzeichen. */
export function phoneUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Website ohne Protokoll und abschließenden Schrägstrich, für die Anzeige. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
