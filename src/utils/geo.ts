import type { LatLng } from '@/types/place';

const EARTH_RADIUS_METERS = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Luftlinie zwischen zwei Punkten (Haversine), in Metern. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type BoundingBox = { low: LatLng; high: LatLng };

/** Rechteck, das einen Kreis vollständig umschließt (für Places Text Search). */
export function boundingBox(center: LatLng, radiusMeters: number): BoundingBox {
  const dLat = toDeg(radiusMeters / EARTH_RADIUS_METERS);
  const dLng = toDeg(radiusMeters / (EARTH_RADIUS_METERS * Math.cos(toRad(center.latitude))));
  return {
    low: { latitude: center.latitude - dLat, longitude: center.longitude - dLng },
    high: { latitude: center.latitude + dLat, longitude: center.longitude + dLng },
  };
}
