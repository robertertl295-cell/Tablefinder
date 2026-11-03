import type { LatLng } from '@/types/place';

import { distanceMeters } from './geo';

const METERS_PER_DEGREE_LAT = 111_320;

export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

/** Kartenausschnitt, der einen Suchkreis mit etwas Rand zeigt. */
export function regionForRadius(center: LatLng, radiusMeters: number): MapRegion {
  const latitudeDelta = ((radiusMeters * 2) / METERS_PER_DEGREE_LAT) * 1.15;
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180);
  return { ...center, latitudeDelta, longitudeDelta };
}

/** Suchradius für einen sichtbaren Kartenausschnitt (halbe kürzere Seite), begrenzt. */
export function radiusForRegion(region: MapRegion): number {
  const heightMeters = region.latitudeDelta * METERS_PER_DEGREE_LAT;
  const widthMeters =
    region.longitudeDelta * METERS_PER_DEGREE_LAT * Math.cos((region.latitude * Math.PI) / 180);
  const radius = Math.min(heightMeters, widthMeters) / 2;
  return Math.round(Math.min(10_000, Math.max(300, radius)));
}

/**
 * Hat sich der Ausschnitt so weit vom Suchkreis entfernt, dass eine neue Suche sinnvoll ist?
 * Ja, wenn der Mittelpunkt um mehr als ein Drittel des Radius verschoben
 * oder der Zoom deutlich verändert wurde.
 */
export function regionDiffersFromSearch(
  region: MapRegion,
  center: LatLng,
  radiusMeters: number,
): boolean {
  const moved = distanceMeters(region, center) > radiusMeters / 3;
  const ratio = radiusForRegion(region) / radiusMeters;
  return moved || ratio > 1.6 || ratio < 0.6;
}
