/** Rohformat der Overpass API (`[out:json]`, `out center tags`). */

export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  /** Bei Knoten */
  lat?: number;
  lon?: number;
  /** Bei Wegen/Relationen mit `out center` */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  elements?: OverpassElement[];
  /** Bei Laufzeitfehlern (z. B. Zeitüberschreitung) liefert Overpass HTTP 200 mit `remark`. */
  remark?: string;
};
