import type { PlaceAttributes, PlaceDetails, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

/**
 * Zusammenführen von Google- und OpenStreetMap-Orten.
 * Ein Google-Ort und ein OSM-Ort gelten als dasselbe Lokal, wenn sie nah beieinander liegen
 * und ihre Namen zusammenpassen. Nur im Arbeitsspeicher – gespeichert wird nichts.
 */

/** Wörter, die fast jedes Lokal im Namen trägt und die beim Vergleich nur stören. */
const GENERIC_WORDS = new Set([
  'restaurant',
  'ristorante',
  'trattoria',
  'pizzeria',
  'cafe',
  'caffe',
  'kaffee',
  'coffee',
  'bar',
  'bistro',
  'imbiss',
  'grill',
  'kitchen',
  'kuche',
  'berlin',
  'the',
  'das',
  'der',
  'die',
  'zum',
  'zur',
  'am',
  'im',
  'und',
  'and',
  'gmbh',
]);

/** Kleinschreibung, ohne Akzente/Umlaute-Punkte, nur Buchstaben und Ziffern als Wörter. */
export function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !GENERIC_WORDS.has(t));
}

function compact(name: string): string {
  return nameTokens(name).join('');
}

/** Ähnlichkeit 0–1 nach Levenshtein-Abstand. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(up + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return 1 - prev[b.length]! / Math.max(a.length, b.length);
}

/** Passen die Namen zusammen? „Nudelwerk Ramen“ ≈ „Nudelwerk“, „Café Krone“ ≈ „Krone“. */
export function namesMatch(a: string, b: string): boolean {
  const ca = compact(a);
  const cb = compact(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  // Einer ist im anderen enthalten (mind. 4 Zeichen, sonst zu beliebig).
  if (Math.min(ca.length, cb.length) >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  const shared = [...ta].filter((t) => tb.has(t) && t.length >= 3).length;
  if (shared > 0 && shared / Math.min(ta.size, tb.size) >= 0.5) return true;
  return similarity(ca, cb) >= 0.8;
}

/** Höchstabstand, ab dem zwei Einträge nicht mehr dasselbe Lokal sein können. */
export const MATCH_MAX_METERS = 80;

/** Bester OSM-Kandidat für einen Google-Ort, oder `null`. Bereits vergebene IDs überspringen. */
export function findMatch<T extends PlaceSummary>(
  place: PlaceSummary,
  candidates: readonly T[],
  taken: ReadonlySet<string> = new Set(),
): T | null {
  let best: { c: T; d: number } | null = null;
  for (const c of candidates) {
    if (taken.has(c.id)) continue;
    const d = distanceMeters(place.location, c.location);
    if (d > MATCH_MAX_METERS) continue;
    if (!namesMatch(place.name, c.name)) continue;
    if (!best || d < best.d) best = { c, d };
  }
  return best?.c ?? null;
}

/**
 * Google-Ort mit OSM-Angaben ergänzen: Google hat Vorrang, OSM füllt Lücken
 * (vegan, glutenfrei, WLAN, rauchfrei …), Küchen werden vereinigt.
 */
export function enrichWithOsm<T extends PlaceSummary | PlaceDetails>(
  google: T,
  osm: PlaceSummary | null,
): T {
  if (!osm) return google;
  const attributes = { ...google.attributes };
  for (const key of Object.keys(attributes) as (keyof PlaceAttributes)[]) {
    attributes[key] = google.attributes[key] ?? osm.attributes[key] ?? null;
  }
  return {
    ...google,
    attributes,
    cuisines: [...new Set([...google.cuisines, ...osm.cuisines])],
    periods: google.periods ?? osm.periods,
  };
}
