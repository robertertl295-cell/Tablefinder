import type { PhotoRef, PlaceDetails } from '@/types/place';

import { TtlCache } from './cache';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';

export type CachedProviderOptions = {
  searchTtlMs?: number;
  detailsTtlMs?: number;
  now?: () => number;
};

/** Koordinaten auf ~10 m runden, damit kleine GPS-Schwankungen den Cache nicht verfehlen. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

export function searchCacheKey(q: SearchQuery): string {
  return JSON.stringify([
    q.text?.trim().toLowerCase() ?? '',
    round(q.center.latitude),
    round(q.center.longitude),
    Math.round(q.radiusMeters),
    q.category ?? null,
    q.minRating ?? null,
    q.priceLevels ? [...q.priceLevels].sort() : null,
    q.openNow ?? false,
    q.includeAttributes ?? false,
    q.pageToken ?? null,
  ]);
}

/**
 * Hülle um einen beliebigen Anbieter:
 * - speichert Ergebnisse kurz im Speicher (Kostenkontrolle),
 * - bündelt gleichzeitige identische Anfragen zu einer einzigen.
 * Fehler werden nicht gecacht.
 */
export class CachedPlacesProvider implements PlacesProvider {
  private readonly searchCache: TtlCache<SearchResult>;
  private readonly detailsCache: TtlCache<PlaceDetails>;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly inner: PlacesProvider,
    options: CachedProviderOptions = {},
  ) {
    this.searchCache = new TtlCache(options.searchTtlMs ?? 2 * 60_000, 50, options.now);
    this.detailsCache = new TtlCache(options.detailsTtlMs ?? 5 * 60_000, 100, options.now);
  }

  get source() {
    return this.inner.source;
  }

  search(query: SearchQuery): Promise<SearchResult> {
    const key = searchCacheKey(query);
    return this.cached(`s:${key}`, this.searchCache, key, () => this.inner.search(query));
  }

  getDetails(id: string): Promise<PlaceDetails> {
    return this.cached(`d:${id}`, this.detailsCache, id, () => this.inner.getDetails(id));
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    return this.inner.getPhotoUrl(photo, maxWidthPx);
  }

  /** Cache leeren, z. B. beim manuellen Aktualisieren (Pull-to-Refresh). */
  clear(): void {
    this.searchCache.clear();
    this.detailsCache.clear();
  }

  private cached<V>(
    flightKey: string,
    cache: TtlCache<V>,
    key: string,
    load: () => Promise<V>,
  ): Promise<V> {
    const hit = cache.get(key);
    if (hit !== undefined) return Promise.resolve(hit);

    const pending = this.inFlight.get(flightKey) as Promise<V> | undefined;
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        cache.set(key, value);
        return value;
      })
      .finally(() => this.inFlight.delete(flightKey));
    this.inFlight.set(flightKey, promise);
    return promise;
  }
}
