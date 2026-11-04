#!/usr/bin/env node
/**
 * Erzeugt KI-Symbolbilder je Restaurant-Typ mit der OpenAI-Bild-API.
 *
 *   OPENAI_API_KEY=… node scripts/generate-placeholders.mjs
 *   DRY_RUN=1 node scripts/generate-placeholders.mjs          → nur Prompts zeigen, nichts kostet
 *   ONLY=pizza,cafe FORCE=1 node scripts/generate-placeholders.mjs
 *
 * Grundlage ist scripts/placeholder-catalog.json (Gruppen × Szenen). Bereits vorhandene Bilder
 * werden übersprungen (außer FORCE=1), ein Abbruch kostet also nichts doppelt.
 * Ergebnis: public/placeholders/<gruppe>-<n>.webp und src/services/placeholders/manifest.json.
 *
 * Läuft per Hand über die GitHub Action „Symbolbilder erzeugen“.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { join } from 'node:path';

const CATALOG = JSON.parse(readFileSync('scripts/placeholder-catalog.json', 'utf8'));
const OUT_DIR = 'public/placeholders';
const MANIFEST = 'src/services/placeholders/manifest.json';

const MODEL = process.env.IMAGE_MODEL || 'gpt-image-1';
const QUALITY = process.env.IMAGE_QUALITY || 'medium';
const MAX_IMAGES = Number(process.env.MAX_IMAGES || 200);
const CONCURRENCY = Number(process.env.CONCURRENCY || 3);
const DRY_RUN = process.env.DRY_RUN === '1';
const FORCE = process.env.FORCE === '1';
const ONLY = (process.env.ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Zielgröße in der App: Karten bis ~400 pt breit, Detailseite volle Breite → 1200 px reicht. */
const TARGET_WIDTH = 1200;

export function buildPrompt(catalog, group, sceneIndex) {
  const g = catalog.groups[group];
  const scene = g.scenes[sceneIndex];
  const light = catalog.lighting[sceneIndex % catalog.lighting.length];
  return `${scene.text}. Setting: a ${g.place} in Berlin. Lighting: ${light}. ${catalog.style}`;
}

export function fileName(group, sceneIndex) {
  return `${group}-${sceneIndex + 1}.webp`;
}

/** Liste aller geplanten Bilder (Gruppe, Szene, Datei, Tags). */
export function plan(catalog, only = []) {
  const jobs = [];
  for (const [group, g] of Object.entries(catalog.groups)) {
    if (only.length && !only.includes(group)) continue;
    g.scenes.forEach((scene, i) => {
      jobs.push({ group, index: i, file: fileName(group, i), tags: scene.tags });
    });
  }
  return jobs;
}

/** Manifest aus den tatsächlich vorhandenen Dateien – die App zeigt nur, was existiert. */
export function buildManifest(catalog, existingFiles) {
  const images = {};
  for (const [group, g] of Object.entries(catalog.groups)) {
    const list = g.scenes
      .map((scene, i) => ({ file: fileName(group, i), tags: scene.tags }))
      .filter((img) => existingFiles.has(img.file));
    if (list.length) images[group] = list;
  }
  return { version: 1, generator: MODEL, images };
}

let sharp = null;
async function loadSharp() {
  try {
    // Optional, nur in der GitHub Action installiert.
    // eslint-disable-next-line import/no-unresolved
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('ℹ sharp nicht installiert – Bilder werden nicht verkleinert.');
  }
}

async function generate(prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: '1536x1024',
      quality: QUALITY,
      output_format: 'webp',
      output_compression: 80,
      n: 1,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body.error?.message ?? `HTTP ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) throw new Error('Antwort ohne Bild');
  let buffer = Buffer.from(b64, 'base64');
  if (sharp) {
    buffer = await sharp(buffer).resize({ width: TARGET_WIDTH }).webp({ quality: 72 }).toBuffer();
  }
  return buffer;
}

async function withRetry(fn, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = error.status === 429 || (error.status ?? 500) >= 500;
      if (!retryable || i >= attempts) throw error;
      const wait = 2 ** i * 5_000;
      console.warn(`  … ${error.message} – neuer Versuch in ${wait / 1000} s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const jobs = plan(CATALOG, ONLY).filter((job) => FORCE || !existsSync(join(OUT_DIR, job.file)));
  console.log(`${jobs.length} Bilder zu erzeugen (Modell ${MODEL}, Qualität ${QUALITY}).`);

  if (DRY_RUN) {
    for (const job of jobs)
      console.log(
        `\n${job.file} [${job.tags.join(', ')}]\n${buildPrompt(CATALOG, job.group, job.index)}`,
      );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('✗ OPENAI_API_KEY fehlt.');
    process.exit(1);
  }
  if (jobs.length > MAX_IMAGES) {
    console.error(
      `✗ ${jobs.length} Bilder > MAX_IMAGES (${MAX_IMAGES}). Kostenbremse – MAX_IMAGES erhöhen.`,
    );
    process.exit(1);
  }
  await loadSharp();

  let done = 0;
  let failed = 0;
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const image = await withRetry(() => generate(buildPrompt(CATALOG, job.group, job.index)));
        writeFileSync(join(OUT_DIR, job.file), image);
        done++;
        console.log(
          `✓ ${job.file} (${(image.length / 1024).toFixed(0)} KB) – ${done}/${jobs.length}`,
        );
      } catch (error) {
        failed++;
        console.warn(`✗ ${job.file}: ${error.message}`);
        // Falscher Key, kein Guthaben, gesperrtes Modell: sofort aufhören statt 150-mal scheitern.
        if ([401, 403].includes(error.status) || /billing|quota/i.test(error.message)) {
          queue.length = 0;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const existing = new Set(readdirSync(OUT_DIR).filter((f) => f.endsWith('.webp')));
  writeFileSync(MANIFEST, `${JSON.stringify(buildManifest(CATALOG, existing), null, 2)}\n`);
  console.log(`\n→ ${done} erzeugt, ${failed} fehlgeschlagen, ${existing.size} Bilder insgesamt.`);
  if (failed && !done) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
