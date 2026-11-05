import type { DataSource, PhotoRef, PlaceDetails, PlaceSummary, SearchSource } from '@/types/place';

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
    private readonly providers: Partial<Record<SearchSource, Provider>>,
    private readonly active: () => SearchSource,
  ) {}

  get source(): SearchSource {
    return this.active();
  }

  // async, damit ein fehlender Anbieter als abgelehntes Promise ankommt, nicht als Ausnahme.
  async search(query: SearchQuery): Promise<SearchResult> {
    return this.pick(this.active()).search(query);
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    return this.forId(id).getDetails(id);
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    return this.forId(id).getSummary(id);
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    const source: DataSource = photo.name.startsWith('mock/') ? 'mock' : 'google';
    return this.providers[source]?.getPhotoUrl(photo, maxWidthPx) ?? null;
  }

  clear(): void {
    for (const p of Object.values(this.providers)) p?.clear?.();
  }

  /** Google-Orte im Kombi-Modus über den Kombi-Anbieter (ergänzt OSM-Angaben). */
  private forId(id: string): Provider {
    const source = sourceOfId(id);
    if (source === 'google' && this.active() === 'combined' && this.providers.combined) {
      return this.providers.combined;
    }
    return this.pick(source);
  }

  private pick(source: SearchSource): Provider {
    const provider = this.providers[source];
    if (!provider) {
      // Nur Google kann fehlen (kein API-Schlüssel).
      throw new PlacesError('auth', 'Für Google-Orte wird ein API-Schlüssel benötigt.');
    }
    return provider;
  }
}
