#!/usr/bin/env node
/**
 * Baut die Web-App (PWA) für „Zum Home-Bildschirm“ auf dem iPhone.
 *
 *   node scripts/build-web.mjs                 → dist/, Wurzelpfad
 *   BASE_URL=/Tablefinder node scripts/build-web.mjs → für GitHub Pages
 *
 * 1. `expo export --platform web` mit optionalem Unterpfad
 * 2. Web-App-Angaben in den <head> von index.html (Manifest, Icon, Vollbild, Statusleiste)
 * 3. 404.html = index.html, damit direkte Links (z. B. /place/…) auf GitHub Pages funktionieren
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT_DIR ?? 'dist';
const BASE = (process.env.BASE_URL ?? '').replace(/\/$/, '');

execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', OUT, '--clear'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_BASE_URL: BASE,
    // Der tägliche OSM-Datensatz liegt neben der App (siehe fetch-osm-berlin.mjs).
    EXPO_PUBLIC_OSM_DATASET_URL:
      process.env.EXPO_PUBLIC_OSM_DATASET_URL ?? `${BASE}/data/osm-berlin.json`,
    EXPO_PUBLIC_PLACEHOLDER_BASE_URL:
      process.env.EXPO_PUBLIC_PLACEHOLDER_BASE_URL ?? `${BASE}/placeholders`,
  },
});

const head = `
    <link rel="manifest" href="${BASE}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Tablefinder" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="application-name" content="Tablefinder" />
    <meta name="description" content="Restaurants, Cafés und Bars in Berlin finden, filtern und merken." />
    <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0C0A09" media="(prefers-color-scheme: dark)" />
    <meta name="format-detection" content="telephone=no" />
    <style id="tablefinder-pwa">
      html, body { background: #FFFFFF; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
      @media (prefers-color-scheme: dark) { html, body { background: #0C0A09; } }
      /* Karte: Rückfall-Kacheln (ohne WebGL) im Dunkelmodus abdunkeln, ruhige Quellenangabe */
      .tf-map-invert .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.4); }
      .leaflet-control-attribution { font-size: 10px; }
      .tf-map-dark .leaflet-control-attribution { background: rgba(28, 25, 23, 0.85); color: #A8A29E; }
      .tf-map-dark .leaflet-control-attribution a { color: #F0876B; }
    </style>
    <style id="tablefinder-viewport">
      /* iOS 26, Home-Bildschirm-App mit viewport-fit=cover und durchsichtiger Statusleiste
         (WebKit-Fehler 301108): Solange die Seite kürzer als der Bildschirm ist, legt iOS sie um
         die Höhe der Statusleiste zu kurz an – unten bleibt ein Balken in der Hintergrundfarbe.
         Ist die Seite mindestens bildschirmhoch, bekommt sie die volle Höhe. Deshalb die Seite
         um die obere Sicherheitszone verlängern; gedeckelt auf 100lvh, damit nichts scrollt,
         wenn iOS schon die volle Höhe liefert. Reine CSS-Regel: kein Messen, kein Flackern. */
      @media (display-mode: standalone) {
        html {
          height: min(100lvh, calc(100% + env(safe-area-inset-top)));
          min-height: min(100lvh, calc(100% + env(safe-area-inset-top)));
        }
      }
      /* display-mode ist auf iOS nicht immer verlässlich – zusätzlich über navigator.standalone. */
      html.tf-standalone {
        height: min(100lvh, calc(100% + env(safe-area-inset-top)));
        min-height: min(100lvh, calc(100% + env(safe-area-inset-top)));
      }
    </style>
    <script id="tablefinder-standalone">
      if (window.navigator.standalone === true) document.documentElement.classList.add('tf-standalone');
    </script>`;

const file = join(OUT, 'index.html');
let html = readFileSync(file, 'utf8');
html = html
  .replace('<html lang="en">', '<html lang="de">')
  // viewport-fit=cover: Inhalte bis unter Notch und Home-Indikator, Ränder über safe-area-insets
  .replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
  )
  .replace('</head>', `${head}\n  </head>`);

if (!html.includes('rel="manifest"') || !html.includes('viewport-fit=cover')) {
  throw new Error('index.html konnte nicht angepasst werden – Expo-Vorlage geändert?');
}
writeFileSync(file, html);
copyFileSync(file, join(OUT, '404.html'));
console.log(`\n✓ Web-App in ${OUT}/ (Basis: ${BASE || '/'})`);
