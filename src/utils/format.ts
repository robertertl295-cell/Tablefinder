import type { PriceLevel } from '@/types/place';

/** Dezimalzahl mit deutschem Komma, ohne Intl-Abhängigkeit. */
function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

/** 4.6 → „4,6“ */
export function formatRating(rating: number): string {
  return decimal(rating, 1);
}

/** 1284 → „1.284“ */
export function formatCount(count: number): string {
  return String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 640 → „640 m“, 1234 → „1,2 km“, 12_400 → „12 km“ */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  if (meters < 10_000) return `${decimal(meters / 1000, 1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/** Für Screenreader: „1,2 Kilometer“ statt „1,2 km“. */
export function spokenDistance(meters: number): string {
  return formatDistance(meters).replace(/ km$/, ' Kilometer').replace(/ m$/, ' Meter');
}

export function formatPriceLevel(level: PriceLevel): string {
  return '€'.repeat(level);
}

export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = {
  1: 'günstig',
  2: 'mittel',
  3: 'gehoben',
  4: 'sehr teuer',
};
