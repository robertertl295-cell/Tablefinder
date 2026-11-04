#!/usr/bin/env node
/**
 * Lädt alle Gastronomie-Orte in Berlin aus OpenStreetMap (Overpass API) und schreibt
 * einen kompakten Datensatz nach public/data/osm-berlin.json.
 *
 * Läuft täglich in der GitHub Action „Web-App veröffentlichen“. Live-Abfragen aus der App
 * sind zu langsam (Messung: ~38 s für 1,5 km); hier darf die Abfrage Minuten dauern.
 *
 *   node scripts/fetch-osm-berlin.mjs
 *   FALLBACK_URL=https://…/data/osm-berlin.json node scripts/fetch-osm-berlin.mjs
 *
 * Schlägt der Abruf fehl, wird – falls FALLBACK_URL gesetzt ist – der zuletzt veröffentlichte
 * Datensatz übernommen. Gibt es auch den nicht, endet das Skript ohne Datei (Exit 0):
 * Die App fällt dann auf Live-Abfragen zurück.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.env.OUT_FILE ?? 'public/data/osm-berlin.json';

/** Muss zu OSM_AMENITIES in src/services/places/osm-mapping.ts passen (Test prüft das). */
export const AMENITIES = [
  'restaurant',
  'cafe',
  'bar',
  'pub',
  'biergarten',
  'fast_food',
  'food_court',
  'ice_cream',
];

/** Berlin mit etwas Rand (Süd, West, Nord, Ost). */
const BERLIN_BBOX = '52.3383,13.0884,52.6755,13.7612';

/** Nur diese Tags nutzt die App – alles andere bleibt draußen (Dateigröße). */
const KEEP_TAGS = [
  'name',
  'amenity',
  'shop',
  'cuisine',
  'diet:vegan',
  'diet:vegetarian',
  'outdoor_seating',
  'dog',
  'takeaway',
  'opening_hours',
  'addr:street',
  'addr:housenumber',
  'addr:postcode',
  'addr:city',
  'addr:suburb',
  'phone',
  'contact:phone',
  'website',
  'contact:website',
];

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Weniger Orte wäre für ganz Berlin unplausibel → als Fehler werten. */
const MIN_ELEMENTS = 2000;

const query = [
  `[out:json][timeout:600][bbox:${BERLIN_BBOX}];`,
  '(',
  `  nwr["amenity"~"^(${AMENITIES.join('|')})$"]["name"];`,
  '  nwr["shop"="bakery"]["name"];',
  ');',
  'out center tags qt;',
].join('\n');

function compact(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined || !el.tags?.name) return null;
  const tags = {};
  for (const key of KEEP_TAGS) if (el.tags[key] !== undefined) tags[key] = el.tags[key];
  // 6 Nachkommastellen ≈ 10 cm – mehr braucht niemand.
  return { type: el.type, id: el.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), tags };
}

async function fetchFrom(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 11 * 60_000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Tablefinder/1.0 (+https://github.com/robertertl295-cell/Tablefinder)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.remark && /error|timed out/i.test(data.remark)) throw new Error(data.remark);
    const elements = (data.elements ?? []).map(compact).filter(Boolean);
    if (elements.length < MIN_ELEMENTS) throw new Error(`nur ${elements.length} Orte`);
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      osmTimestamp: data.osm3s?.timestamp_osm_base ?? null,
      source: 'OpenStreetMap (Overpass API)',
      license: 'ODbL – © OpenStreetMap-Mitwirkende',
      elements,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fallback() {
  const url = process.env.FALLBACK_URL;
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.elements) || data.elements.length < MIN_ELEMENTS) {
      throw new Error('ungültig');
    }
    return data;
  } catch (error) {
    console.warn(`Kein früherer Datensatz verfügbar (${error.message}).`);
    return null;
  }
}

async function main() {
  let dataset = null;
  for (const endpoint of ENDPOINTS) {
    const started = Date.now();
    try {
      console.log(`Frage ${endpoint} …`);
      dataset = await fetchFrom(endpoint);
      console.log(
        `✓ ${dataset.elements.length} Orte in ${((Date.now() - started) / 1000).toFixed(0)} s`,
      );
      break;
    } catch (error) {
      console.warn(`✗ ${endpoint}: ${error.message}`);
    }
  }
  if (!dataset) {
    dataset = await fallback();
    if (dataset) console.log(`↺ Übernehme früheren Datensatz vom ${dataset.generatedAt}`);
  }
  if (!dataset) {
    console.warn('⚠ Kein Datensatz – die App nutzt Live-Abfragen.');
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  const json = JSON.stringify(dataset);
  writeFileSync(OUT, json);
  console.log(`→ ${OUT} (${(json.length / 1024 / 1024).toFixed(1)} MB)`);
}

await main();
