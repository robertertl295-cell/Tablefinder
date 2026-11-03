import type { PhotoRef, PlaceDetails, PlaceSummary } from '@/types/place';

import { PlacesError } from './errors';
import { MOCK_PLACES, type MockPlace } from './mock-data';
import type { PlacesProvider, SearchQuery, SearchResult } from './provider';
import { matchesQuery } from './query-filter';

export type MockPlacesProviderOptions = {
  places?: MockPlace[];
  /** Simulierte Antwortzeit in ms. */
  latencyMs?: number;
  pageSize?: number;
};

/** Kleinbuchstaben, ohne Akzente: „Café“ → „cafe“. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function toSummary(p: MockPlace): PlaceSummary {
  return {
    id: p.id,
    name: p.name,
    primaryType: p.primaryType,
    typeLabel: p.typeLabel,
    types: p.types,
    location: p.location,
    shortAddress: p.shortAddress,
    rating: p.rating,
    ratingCount: p.ratingCount,
    priceLevel: p.priceLevel,
    openNow: p.openNow,
    businessStatus: p.businessStatus,
    photo: p.photo,
    attributes: p.attributes,
  };
}

function toDetails(p: MockPlace): PlaceDetails {
  // Hilfsfelder des Mocks nicht nach außen geben.
  const { keywords: _keywords, district: _district, ...details } = p;
  return details;
}

function matchesText(p: MockPlace, text: string): boolean {
  const haystack = normalizeText(
    [p.name, p.typeLabel ?? '', p.shortAddress ?? '', p.district, ...p.keywords].join(' '),
  );
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/** Anbieter mit lokalen Beispieldaten – für Entwicklung ohne Key und für Tests. */
export class MockPlacesProvider implements PlacesProvider {
  readonly source = 'mock' as const;

  private readonly places: MockPlace[];
  private readonly latencyMs: number;
  private readonly pageSize: number;

  constructor(options: MockPlacesProviderOptions = {}) {
    this.places = options.places ?? MOCK_PLACES;
    this.latencyMs = options.latencyMs ?? 300;
    this.pageSize = options.pageSize ?? 10;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    await wait(this.latencyMs);
    const text = query.text?.trim();
    const matches = this.places
      .filter((p) => !text || matchesText(p, text))
      .filter((p) => matchesQuery(toSummary(p), query));

    const offset = query.pageToken ? Number.parseInt(query.pageToken, 10) || 0 : 0;
    const page = matches.slice(offset, offset + this.pageSize);
    const next = offset + this.pageSize;
    return {
      places: page.map(toSummary),
      nextPageToken: next < matches.length ? String(next) : null,
    };
  }

  async getDetails(id: string): Promise<PlaceDetails> {
    await wait(this.latencyMs);
    const found = this.places.find((p) => p.id === id);
    if (!found) throw new PlacesError('not_found', `Unbekannte ID: ${id}`, 404);
    return toDetails(found);
  }

  async getSummary(id: string): Promise<PlaceSummary> {
    await wait(this.latencyMs);
    const found = this.places.find((p) => p.id === id);
    if (!found) throw new PlacesError('not_found', `Unbekannte ID: ${id}`, 404);
    return toSummary(found);
  }

  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null {
    // Neutrale Platzhalterbilder; `seed` sorgt für stabile Bilder je Foto.
    const width = Math.round(maxWidthPx);
    const height = Math.round((width * 2) / 3);
    return `https://picsum.photos/seed/${encodeURIComponent(photo.name)}/${width}/${height}`;
  }
}
