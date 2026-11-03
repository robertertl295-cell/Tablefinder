import type { PhotoRef, PlaceDetails, PlaceSummary } from '@/types/place';
import { boundingBox } from '@/utils/geo';

import { PlacesError, type PlacesErrorKind } from './errors';
import { detailsFieldMask, searchFieldMask, summaryFieldMask } from './field-masks';
import type { GErrorBody, GPlace, GSearchResponse } from './google-types';
import { mapPlaceDetails, mapPlaceSummary, PRICE_LEVEL_TO_GOOGLE } from './mapping';
import { CATEGORY_TO_GOOGLE_TYPE, NEARBY_INCLUDED_TYPES } from './place-types';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';
import { matchesQuery, normalizeMinRating } from './query-filter';

export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

/** Google erlaubt bei Suchen höchstens 50 km Radius und 20 Treffer pro Seite. */
const MAX_RADIUS_METERS = 50_000;
const PAGE_SIZE = 20;

type FetchFn = typeof fetch;

export type GooglePlacesProviderOptions = {
  apiKey: string;
  fetchFn?: FetchFn;
  timeoutMs?: number;
  languageCode?: string;
  regionCode?: string;
};

const STATUS_TO_KIND: Record<string, PlacesErrorKind> = {
  RESOURCE_EXHAUSTED: 'quota',
  PERMISSION_DENIED: 'auth',
  UNAUTHENTICATED: 'auth',
  INVALID_ARGUMENT: 'invalid_request',
  FAILED_PRECONDITION: 'invalid_request',
  NOT_FOUND: 'not_found',
};

function kindFromHttp(status: number): PlacesErrorKind {
  if (status === 429) return 'quota';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status >= 400 && status < 500) return 'invalid_request';
  if (status >= 500) return 'server';
  return 'unknown';
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly source = 'google' as const;

  private readonly apiKey: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;
  private readonly languageCode: string;
  private readonly regionCode: string;

  constructor(options: GooglePlacesProviderOptions) {
    this.apiKey = options.apiKey;
    // Bind nötig, sonst „Illegal invocation“ in manchen Umgebungen.
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.languageCode = options.languageCode ?? 'de';
    this.regionCode = options.regionCode ?? 'DE';
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const text = query.text?.trim();
    const response = text ? await this.textSearch(text, query) : await this.nearbySearch(query);

    const places: PlaceSummary[] = [];
    for (const raw of response.places ?? []) {
      let place: PlaceSummary;
      try {
        place = mapPlaceSummary(raw);
      } catch {
        continue; // unvollständige Einträge überspringen
      }
      if (matchesQuery(place, query)) places.push(place);
    }
    return { places, nextPageToken: response.nextPageToken ?? null };
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    const params = new URLSearchParams({
      languageCode: this.languageCode,
      regionCode: this.regionCode,
    });
    const raw = await this.request<GPlace>(
      `/places/${encodeURIComponent(id)}?${params.toString()}`,
      { method: 'GET', fieldMask: detailsFieldMask() },
    );
    return mapPlaceDetails(raw);
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    const params = new URLSearchParams({
      languageCode: this.languageCode,
      regionCode: this.regionCode,
    });
    const raw = await this.request<GPlace>(
      `/places/${encodeURIComponent(id)}?${params.toString()}`,
      { method: 'GET', fieldMask: summaryFieldMask() },
    );
    return mapPlaceSummary(raw);
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    const width = Math.max(1, Math.min(4800, Math.round(maxWidthPx)));
    return `${GOOGLE_PLACES_BASE_URL}/${photo.name}/media?maxWidthPx=${width}&key=${encodeURIComponent(this.apiKey)}`;
  }

  private textSearch(text: string, query: SearchQuery): Promise<GSearchResponse> {
    const radius = Math.min(query.radiusMeters, MAX_RADIUS_METERS);
    const body: Record<string, unknown> = {
      textQuery: text,
      languageCode: this.languageCode,
      regionCode: this.regionCode,
      pageSize: PAGE_SIZE,
      // Text Search kennt als Begrenzung nur Rechtecke; der Kreis wird danach clientseitig geprüft.
      locationRestriction: { rectangle: boundingBox(query.center, radius) },
    };
    if (query.category) {
      body.includedType = CATEGORY_TO_GOOGLE_TYPE[query.category];
      body.strictTypeFiltering = true;
    }
    const minRating = normalizeMinRating(query.minRating);
    if (minRating !== undefined) body.minRating = minRating;
    if (query.openNow) body.openNow = true;
    if (query.priceLevels?.length) {
      body.priceLevels = query.priceLevels.map((p) => PRICE_LEVEL_TO_GOOGLE[p]);
    }
    if (query.pageToken) body.pageToken = query.pageToken;

    return this.request<GSearchResponse>('/places:searchText', {
      method: 'POST',
      body,
      fieldMask: searchFieldMask({
        includeAttributes: query.includeAttributes ?? false,
        withPageToken: true,
      }),
    });
  }

  /** Umgebungssuche ohne Suchbegriff. Liefert max. 20 Treffer, keine weiteren Seiten. */
  private nearbySearch(query: SearchQuery): Promise<GSearchResponse> {
    if (query.pageToken) return Promise.resolve({ places: [] });
    const includedTypes = query.category
      ? [CATEGORY_TO_GOOGLE_TYPE[query.category]]
      : [...NEARBY_INCLUDED_TYPES];
    return this.request<GSearchResponse>('/places:searchNearby', {
      method: 'POST',
      body: {
        includedTypes,
        maxResultCount: PAGE_SIZE,
        rankPreference: 'POPULARITY',
        languageCode: this.languageCode,
        regionCode: this.regionCode,
        locationRestriction: {
          circle: {
            center: query.center,
            radius: Math.min(query.radiusMeters, MAX_RADIUS_METERS),
          },
        },
      },
      fieldMask: searchFieldMask({
        includeAttributes: query.includeAttributes ?? false,
        withPageToken: false,
      }),
    });
  }

  private async request<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown; fieldMask: string },
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(`${GOOGLE_PLACES_BASE_URL}${path}`, {
        method: init.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': init.fieldMask,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new PlacesError('timeout', 'Zeitüberschreitung bei der Places-Anfrage');
      }
      throw new PlacesError('network', error instanceof Error ? error.message : 'Netzwerkfehler');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GErrorBody;
      const status = body.error?.status;
      const kind = (status && STATUS_TO_KIND[status]) || kindFromHttp(response.status);
      throw new PlacesError(
        kind,
        body.error?.message ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new PlacesError('server', 'Antwort konnte nicht gelesen werden', response.status);
    }
  }
}
