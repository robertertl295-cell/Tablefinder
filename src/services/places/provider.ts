import type {
  DataSource,
  LatLng,
  PhotoRef,
  PlaceCategory,
  PlaceDetails,
  PlaceSummary,
  PriceLevel,
} from '@/types/place';

export type SearchQuery = {
  /** Freitext, z. B. „Ramen“ oder „vegan Kreuzberg“. Leer = alles in der Nähe. */
  text?: string;
  center: LatLng;
  radiusMeters: number;
  category?: PlaceCategory;
  /** 0–5; wird auf 0,5er-Schritte abgerundet. */
  minRating?: number;
  priceLevels?: PriceLevel[];
  openNow?: boolean;
  /**
   * Angebots-Merkmale (vegetarisch, Außenplätze …) mitladen.
   * Kostet bei Google eine höhere Abrechnungsstufe – nur setzen, wenn ein solcher Filter aktiv ist.
   */
  includeAttributes?: boolean;
  /** Token für die nächste Seite aus einem vorherigen `SearchResult`. */
  pageToken?: string;
};

export type SearchResult = {
  places: PlaceSummary[];
  /** `null` = keine weiteren Seiten. */
  nextPageToken: string | null;
};

/**
 * Abstraktion über die Datenquelle (Google Places, Mock, später z. B. OpenStreetMap).
 * Alle Methoden werfen bei Fehlern einen `PlacesError`.
 */
export interface PlacesProvider {
  readonly source: DataSource;
  search(query: SearchQuery): Promise<SearchResult>;
  getDetails(id: string): Promise<PlaceDetails>;
  /** Direkt ladbare Bild-URL oder `null`, wenn keine verfügbar ist. */
  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null;
}
