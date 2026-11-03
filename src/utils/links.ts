import { Platform as RNPlatform } from 'react-native';

import type { LatLng } from '@/types/place';

export type Platform = 'ios' | 'android' | 'web' | string;

/**
 * Link, der eine Route zum Ort in der Karten-App öffnet.
 * iOS: Apple Maps. Android: `geo:` – das System bietet alle installierten Karten-Apps an.
 */
export function directionsUrl(platform: Platform, location: LatLng, name: string): string {
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
