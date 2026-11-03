import type { DataSource, PhotoRef, PlaceDetails, PlaceSummary } from '@/types/place';

import { PlacesError } from './errors';
import { isOsmId } from './osm-mapping';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';

type Provider = PlacesProvider & { clear?: () => void };

/** Aus welcher Quelle eine ID stammt (Favoriten können aus mehreren Quellen kommen). */
export function sourceOfId(id: string): DataSource {
  if (isOsmId(id)) return 'osm';
  if (id.startsWith('mock-')) return 'mock';
  return 'google';
}

/**
 * Leitet Anfragen an die passende Quelle:
 * - Suchen an die aktive Quelle (Einstellung),
 * - Details/Kurzdaten/Fotos an die Quelle, aus der die ID stammt.
 */
export class RoutingPlacesProvider implements PlacesProvider {
  constructor(
    private readonly providers: Partial<Record<DataSource, Provider>>,
    private readonly active: () => DataSource,
  ) {}

  get source(): DataSource {
    return this.active();
  }

  // async, damit ein fehlender Anbieter als abgelehntes Promise ankommt, nicht als Ausnahme.
  async search(query: SearchQuery): Promise<SearchResult> {
    return this.pick(this.active()).search(query);
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    return this.pick(sourceOfId(id)).getDetails(id);
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    return this.pick(sourceOfId(id)).getSummary(id);
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    const source: DataSource = photo.name.startsWith('mock/') ? 'mock' : 'google';
    return this.providers[source]?.getPhotoUrl(photo, maxWidthPx) ?? null;
  }

  clear(): void {
    for (const p of Object.values(this.providers)) p?.clear?.();
  }

  private pick(source: DataSource): Provider {
    const provider = this.providers[source];
    if (!provider) {
      // Nur Google kann fehlen (kein API-Schlüssel).
      throw new PlacesError('auth', 'Für Google-Orte wird ein API-Schlüssel benötigt.');
    }
    return provider;
  }
}
