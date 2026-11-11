import type { LatLng } from '@/types/place';

/**
 * Googles Umgebungssuche liefert höchstens 20 Orte pro Anfrage und keine weiteren Seiten.
 * Damit beim Weiterscrollen mehr Lokale kommen, wird der Suchkreis in Teilkreise zerlegt:
 * Seite 1 = ganzer Kreis (die beliebtesten 20), danach Mitte und sechs Kreise im Ring.
 *
 * Geometrie: Teilkreise mit 0,55 R, Ringmittelpunkte bei 0,75 R – so ist der ganze Kreis
 * ohne Lücken abgedeckt (geprüft in search-cells.test.ts).
 */
export type SearchCell = { center: LatLng; radiusMeters: number };

const CELL_RADIUS = 0.55;
const RING_DISTANCE = 0.75;
const RING_CELLS = 6;
/** Kleine Kreise brauchen keine Teilkreise – 20 Treffer decken sie meist ab. */
export const MIN_RADIUS_FOR_CELLS = 600;

export function offset(center: LatLng, meters: number, bearingDeg: number): LatLng {
  const a = (bearingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(a)) / 111_320;
  const dLng = (meters * Math.sin(a)) / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
  return { latitude: center.latitude + dLat, longitude: center.longitude + dLng };
}

export function searchCells(center: LatLng, radiusMeters: number): SearchCell[] {
  const cells: SearchCell[] = [{ center, radiusMeters }];
  if (radiusMeters < MIN_RADIUS_FOR_CELLS) return cells;
  const r = Math.round(radiusMeters * CELL_RADIUS);
  cells.push({ center, radiusMeters: r });
  for (let i = 0; i < RING_CELLS; i++) {
    cells.push({
      center: offset(center, radiusMeters * RING_DISTANCE, i * (360 / RING_CELLS)),
      radiusMeters: r,
    });
  }
  return cells;
}
