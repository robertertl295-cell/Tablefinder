import type { PriceLevel } from '@/types/place';

export type Units = 'metric' | 'imperial';

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

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

/**
 * Metrisch: 640 → „640 m“, 1234 → „1,2 km“, 12_400 → „12 km“.
 * Imperial: unter 0,1 mi in Fuß („500 ft“), sonst Meilen („0,8 mi“, „12 mi“).
 */
export function formatDistance(meters: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const miles = meters / METERS_PER_MILE;
    if (miles < 0.1) return `${Math.max(10, Math.round(meters / METERS_PER_FOOT / 10) * 10)} ft`;
    if (miles < 10) return `${decimal(miles, 1)} mi`;
    return `${Math.round(miles)} mi`;
  }
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  if (meters < 10_000) return `${decimal(meters / 1000, 1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/** Für Screenreader: „1,2 Kilometer“ statt „1,2 km“. */
export function spokenDistance(meters: number, units: Units = 'metric'): string {
  return formatDistance(meters, units)
    .replace(/ km$/, ' Kilometer')
    .replace(/ m$/, ' Meter')
    .replace(/ mi$/, ' Meilen')
    .replace(/ ft$/, ' Fuß');
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
