# Tablefinder

[![CI](https://github.com/robertertl295-cell/Tablefinder/actions/workflows/ci.yml/badge.svg)](https://github.com/robertertl295-cell/Tablefinder/actions/workflows/ci.yml)

Mobile App (iOS und Android) zur Suche nach Restaurants, Cafés, Bars, Bäckereien und Imbissen in Berlin. Für den persönlichen Gebrauch.

**Funktionen:** Suche, feine Filter, Detailansicht, Favoriten mit eigenen Listen und Notizen.
**Bewusst nicht enthalten:** Reservierung, Lieferung, Bezahlung, Social Feed, Nutzerkonten.

**Was Tablefinder von anderen Apps unterscheidet:**

1. **Bewertungen ehrlich darstellen:** Sterne stehen immer zusammen mit der Anzahl der Bewertungen. Unter 30 Bewertungen erscheint deutlich „Wenig Datenbasis“. Die Detailseite zeigt, wie belastbar der Schnitt ist, und einen **Vertrauensscore**, nach dem sich die Treffer auch sortieren lassen.
2. **Feine Filter:** Art, Küche, Öffnungszeiten (jetzt, spät, sonntags), Bewertung, Preis, Umkreis, Ernährung (vegetarisch, vegan, glutenfrei, halal), Ausstattung (Außenplätze, Hund, barrierefrei, WLAN, rauchfrei, Gruppen, Kinder), Service (Mitnehmen, Lieferung, Reservierung, Kartenzahlung) und Mahlzeiten.
3. **Schnelle Favoriten:** eigene Listen, Notiz, „besucht“, eigene Bewertung und eine Sicherung als JSON-Datei.

**Zwei Datenquellen:** Google Places (mit Bewertungen und Fotos, API-Key nötig) oder kostenlos OpenStreetMap (ohne Key, mit Vegan-Filter).

## Stand

Alle acht Phasen aus dem Auftrag sind umgesetzt.

| Phase | Inhalt                                                 | Status |
| ----- | ------------------------------------------------------ | ------ |
| 1     | Setup, Struktur, Linting, README                       | ✅     |
| 2     | Datenschicht (`PlacesProvider`, Mock-Daten, Tests)     | ✅     |
| 3     | Suche, Liste und Karte, Standort                       | ✅     |
| 4     | Filter mit Chips und Persistenz                        | ✅     |
| 5     | Detailseite                                            | ✅     |
| 6     | Favoriten und Listen, Export/Import                    | ✅     |
| 7     | Feinschliff (Dark Mode, Barrierefreiheit, Performance) | ✅     |
| 8     | Abschluss                                              | ✅     |

**Geprüft wurde:**

- Typecheck, Lint und 365 Tests laufen ohne Fehler.
- Die App-Pakete für iOS und Android lassen sich bauen (`expo export`).
- Die Oberfläche wurde in jeder Phase in einer Browser-Vorschau angesehen, in Hell und Dunkel.

**Noch nicht geprüft** (siehe [Nächste Schritte](#nächste-schritte)):

- auf einem echten Gerät oder Simulator
- mit einem echten Google-API-Key

## Schnellstart

Voraussetzungen: Node.js 20 oder neuer, npm, ein iOS-Simulator (macOS mit Xcode) oder ein Android-Emulator bzw. ein Handy mit Expo Go.

```bash
npm install
cp .env.example .env     # Keys optional, siehe unten
npm start                # danach i (iOS), a (Android) oder QR-Code mit Expo Go scannen
```

Ohne API-Key sucht die App mit **OpenStreetMap** (kostenlos, Internet nötig). In den Einstellungen lässt sich auf 18 erfundene Berliner Lokale (Beispieldaten, ohne Internet) umstellen. Siehe [Datenquellen](#datenquellen).

**Expo Go oder Development Build:** Alle nativen Module stammen aus dem Expo SDK 58: Maps, SQLite, Location, Image, Sharing, Document Picker, File System. Sie sollten daher in Expo Go laufen. Für einen eigenen Google-Maps-Key auf Android und für Produktions-Builds braucht es einen Development Build:

```bash
npx expo run:ios
npx expo run:android
```

## Auf dem iPhone nutzen

**Weg 1 – Web-App auf dem Home-Bildschirm (empfohlen, kostenlos, ohne App Store):**

Wie bei AGNES der HU Berlin: Tablefinder läuft als Website, startet aber vom Home-Bildschirm mit eigenem Symbol, im Vollbild und ohne Browserleiste.

1. Auf dem iPhone in **Safari** öffnen: **https://robertertl295-cell.github.io/Tablefinder/**
2. Unten auf **Teilen** (Quadrat mit Pfeil) tippen → **„Zum Home-Bildschirm“** → **Hinzufügen**.
3. Tablefinder über das neue Symbol starten. Beim ersten Mal nach dem Standort fragen lassen und „Erlauben“ wählen.

- **Updates:** Jeder Push auf `main` veröffentlicht automatisch eine neue Version (`.github/workflows/deploy-web.yml`). Die App holt sie beim nächsten Start.
- **Daten:** Die Web-App sucht mit OpenStreetMap. Einen Google-Key bekommt sie bewusst nicht, weil er auf einer öffentlichen Seite für alle auslesbar wäre.
- **Speicher:** Favoriten liegen im Speicher dieser Web-App auf dem iPhone. Wer in Safari die Website-Daten löscht, löscht sie mit. Zur Sicherheit gibt es den JSON-Export unter Favoriten → Verwalten.
- **Einmalig einrichten:** Im Repository unter **Settings → Pages → Build and deployment → Source** auf **„GitHub Actions“** stellen. Danach unter **Actions → „Web-App veröffentlichen“ → Run workflow** starten, oder einfach den nächsten Push abwarten.

**Weg 2 – Expo Go (zum Entwickeln, mit Rechner):**

1. Auf dem iPhone die App **Expo Go** aus dem App Store installieren.
2. Auf einem Rechner (Mac, Windows oder Linux mit Node.js 20+) das Projekt klonen und starten:
   ```bash
   git clone https://github.com/robertertl295-cell/Tablefinder.git
   cd Tablefinder
   npm install
   npx expo start
   ```
3. Den QR-Code mit der iPhone-Kamera scannen. Die App öffnet sich in Expo Go.

- **WLAN:** iPhone und Rechner müssen im selben WLAN sein. Klappt das nicht: `npx expo start --tunnel`.
- **Nur mit Rechner:** Die App läuft nur, solange der Rechner den Dev-Server bereitstellt. Gut zum Ausprobieren, nicht für den Alltag.

**Weg 3 – native App über den App-Store-Weg (dauerhaft, kostenpflichtig):** über EAS Build, den Cloud-Build-Dienst von Expo. Man braucht dafür:

- ein kostenloses Expo-Konto
- das **Apple Developer Program** (99 €/Jahr), um die App für echte Geräte zu signieren

```bash
npm install -g eas-cli
eas login
eas init                                   # Projekt anlegen, Project-ID notieren
eas device:create                          # iPhone registrieren (Link öffnen, Profil installieren)
eas build --platform ios --profile preview # signierte .ipa, Installation per Link/QR-Code
```

- **Projekt-ID:** `eas init` vergibt eine Project-ID. Bei dieser dynamischen Konfiguration (`app.config.ts`) setzt man sie als Umgebungsvariable `EAS_PROJECT_ID` oder trägt sie unter `extra.eas.projectId` ein.
- **Zertifikate:** EAS legt Zertifikate und Profile beim ersten Build selbst an, nach Anmeldung mit der Apple-ID.
- **Google-Key:** Soll die App mit Google suchen, den Key für den Build hinterlegen: `eas env:create --name EXPO_PUBLIC_PLACES_API_KEY --value … --environment preview`. Ohne Key sucht sie mit OpenStreetMap.
- **TestFlight:** Für TestFlight bzw. den App Store stattdessen `eas build --platform ios --profile production` und danach `eas submit --platform ios`.

Build-Profile in `eas.json`:

| Profil       | Ergebnis                                                             | Apple Developer Program |
| ------------ | -------------------------------------------------------------------- | ----------------------- |
| `preview`    | `.ipa` für registrierte Geräte, Installation per Link                | ja                      |
| `production` | `.ipa` für TestFlight/App Store, Build-Nummer zählt automatisch hoch | ja                      |
| `simulator`  | `.app` für den iOS-Simulator auf einem Mac                           | nein                    |

Alle Profile bauen mit dem neuesten verfügbaren Xcode/iOS-SDK (`"image": "latest"`).

## API-Keys

Keys stehen ausschließlich in `.env`. Diese Datei ist in `.gitignore` eingetragen und wird nie committet.

| Variable                      | Wofür                                                                        | Pflicht                        |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| `EXPO_PUBLIC_PLACES_API_KEY`  | Google Places API (New): Text Search, Nearby Search, Place Details, Fotos    | nein (ohne Key: OpenStreetMap) |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Google Maps SDK for Android, wird beim Build über `app.config.ts` eingesetzt | nur für Android-Builds         |

So legst du den Places-Key an:

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen und die Abrechnung aktivieren.
2. **Places API (New)** aktivieren. Für Android zusätzlich **Maps SDK for Android**.
3. Einen API-Key erstellen und **einschränken**:
   - API-Einschränkung: nur „Places API (New)“.
   - App-Einschränkung: iOS-Bundle-ID bzw. Android-Paketname `de.tablefinder.app` (für Android zusätzlich der SHA-1-Fingerabdruck).
4. Ein Tageskontingent (Quota) und eine Budgetwarnung setzen, um die Kosten zu begrenzen.

> ⚠️ Variablen mit `EXPO_PUBLIC_` werden ins App-Paket eingebaut und lassen sich daraus auslesen. Auch die Foto-URLs enthalten den Key. Die Einschränkungen und das Tageskontingent sind deshalb Pflicht. Für mehr als den persönlichen Gebrauch: siehe Proxy unter [Nächste Schritte](#nächste-schritte).

## Web-App (PWA)

Dieselbe Codebasis läuft im Browser. Für die Nutzung als App vom Home-Bildschirm gibt es dort eigene Varianten, die Expo über die Endung `.web.tsx`/`.web.ts` automatisch wählt:

| Baustein   | Web-Variante                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tab-Leiste | `(tabs)/_layout.web.tsx`: unten wie in iOS, mit Abstand zum Home-Indikator                                                               |
| Karte      | `results-map.web.tsx`, `mini-map.web.tsx`: Leaflet mit OpenFreeMap-Vektorkarte (MapLibre GL, `base-map.web.tsx`), ohne WebGL OSM-Kacheln |
| Dialoge    | `dialog.web.ts` + `dialog-host.web.tsx`: eigener Dialog im App-Stil, weil `Alert` im Browser wirkungslos ist                             |
| Speicher   | `storage.web.ts`: `localStorage` statt SQLite                                                                                            |
| Sicherung  | `favorites-file.web.ts`: Download bzw. Dateiauswahl statt Teilen-Menü                                                                    |
| Hinweis    | `install-hint.web.tsx`: „Zum Home-Bildschirm“, nur in Safari auf iPhone/iPad, schließbar                                                 |

**Build:** `npm run build:web` (Skript `scripts/build-web.mjs`)

- `expo export --platform web` mit optionalem Unterpfad (`BASE_URL=/Tablefinder` für GitHub Pages).
- Web-App-Angaben im `<head>`: Manifest, `apple-touch-icon`, Vollbild (`apple-mobile-web-app-capable`), Statusleiste, `viewport-fit=cover` für Notch und Home-Indikator, Theme-Farben hell/dunkel.
- `404.html` als Kopie von `index.html`, damit direkte Links (z. B. `/Tablefinder/place/…`) funktionieren.
- Manifest und Icons liegen in `public/`. Das App-Symbol stammt aus `assets/images/icon-source.svg`.

**Routen:** „Route“ öffnet auf dem iPhone auch aus der Web-App heraus Apple Maps.

## Skripte

| Befehl              | Zweck                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| `npm start`         | Dev-Server starten                                                         |
| `npm run typecheck` | TypeScript prüfen (strict)                                                 |
| `npm run lint`      | ESLint (Expo-Konfiguration + Prettier)                                     |
| `npm run format`    | Code mit Prettier formatieren                                              |
| `npm test`          | Jest-Tests                                                                 |
| `npm run check`     | Typecheck, Lint und Tests in einem Durchlauf                               |
| `npm run build:web` | Web-App (PWA) nach `dist/` bauen; `BASE_URL=/Tablefinder` für GitHub Pages |

**CI:** Die GitHub Action `.github/workflows/ci.yml` läuft bei jedem Push auf `main`, bei jedem Pull Request und auf Knopfdruck. Sie führt Typecheck, Lint, Formatprüfung und Tests aus (Node 22, `npm ci`). Ein neuer Push bricht einen noch laufenden Durchlauf für denselben Branch ab.

## Projektstruktur

```
src/
  app/                       Expo Router: jede Datei ist ein Screen
    _layout.tsx                Root-Stack: Tabs, Detailseite, Sheets
    (tabs)/_layout.tsx         Tab-Leiste: Suche, Karte, Favoriten, Einstellungen; startet die Auto-Suche
    (tabs)/index.tsx           Suche (Liste/Karte, Ortswahl, Filter-Chips)
    (tabs)/map.tsx             Vollbild-Karte der aktuellen Suche
    (tabs)/favorites.tsx       Favoriten (Listen, Besuchsstatus, Sortierung, Liste/Karte)
    (tabs)/settings.tsx        Einstellungen
    place/[id].tsx             Detailseite inkl. „Meine Notizen“
    filters.tsx                Filter (Bottom Sheet)
    favorites-manage.tsx       Listen verwalten, Sicherung (Bottom Sheet)
  components/                UI-Bausteine: place/, detail/, favorites/, filters/, search/, state/, ui/
  constants/                 Farb-Tokens (hell/dunkel), Abstände, Radien; Berliner Ortsteile
  hooks/                     Auto-Suche, Details laden, Favoriten-Orte laden, Debounce, Theme, Bewegung reduzieren
  services/
    places/                  Datenschicht (siehe unten)
    config.ts                Key aus .env, Standard-Standort und -Radius
    location.ts              Standortfreigabe und Position
    storage.ts               Dauerhafter Speicher (SQLite-KV); Web-Variante: localStorage
    favorites-file.ts        Sicherungsdatei teilen und importieren
    *.web.ts(x)              Web-Varianten (Karte, Dialoge, Speicher, Sicherung, Tab-Leiste)
    local-data.ts            „Alle lokalen Daten löschen“
  store/                     Zustand-Stores: Suche, Filter, Favoriten, Einstellungen
  types/                     Domänentypen: Ort, Filter, Favoriten
  utils/                     Reine, getestete Logik: Filter, Favoriten, Öffnungszeiten, Format, Geo, Kontrast …
  __tests__/                 Jest-Tests
public/                      Manifest und Icons der Web-App
scripts/build-web.mjs        Build der Web-App (PWA)
eas.json                     Build-Profile für die native iOS-App
app.config.ts                Expo-Konfiguration, liest Keys aus der Umgebung
jest.setup.ts                Test-Ersatz für Karte und SQLite
```

## Datenschicht

Alles liegt unter `src/services/places/`. Die Oberfläche spricht nur das Interface `PlacesProvider` an und bekommt eigene Typen aus `src/types/place.ts`. Google- und OSM-Formate dringen nicht nach außen.

```ts
interface PlacesProvider {
  search(query: SearchQuery): Promise<SearchResult>; // Text- oder Umgebungssuche, seitenweise
  getDetails(id: string): Promise<PlaceDetails>; // Detailseite
  getSummary(id: string): Promise<PlaceSummary>; // nur Kartenfelder (Favoritenliste, günstiger)
  getPhotoUrl(photo: PhotoRef, maxWidthPx: number): string | null;
}
```

```
placesProvider (index.ts)
└── RoutingPlacesProvider       Suche → aktive Quelle (Einstellung); Details/Favoriten → Quelle der ID
    ├── CachedPlacesProvider → GooglePlacesProvider     nur mit EXPO_PUBLIC_PLACES_API_KEY
    ├── CachedPlacesProvider → OverpassPlacesProvider   OpenStreetMap, IDs „osm:node:123“
    └── CachedPlacesProvider → MockPlacesProvider       18 erfundene Lokale, IDs „mock-…“

CachedPlacesProvider: Suche 2 Min., Details/Kurzdaten 5 Min.; bündelt gleichzeitige Anfragen
```

| Datei                  | Aufgabe                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `google-provider.ts`   | Text Search (mit Suchbegriff), Nearby Search (ohne Suchbegriff), Place Details, Foto-URLs, Timeout nach 10 s                                                                                                  |
| `field-masks.ts`       | Feldmasken. Angebots-Merkmale (vegetarisch, Außenplätze …) werden nur mit `includeAttributes: true` geladen, weil sie eine teurere Abrechnungsstufe auslösen.                                                 |
| `mapping.ts`           | Wandelt Google-Formate in eigene Typen um. Fehlende Angaben werden `null`, nie geraten. Rezensionen werden nach Datum sortiert.                                                                               |
| `place-types.ts`       | Welche Typen als Gastronomie gelten. Maßgeblich ist der Haupttyp, so fliegt z. B. ein Hotel mit Restaurant raus.                                                                                              |
| `query-filter.ts`      | Gemeinsame Prüfung (Gastronomie, Radius, Kategorie, Bewertung, Preis, geöffnet) für alle Anbieter                                                                                                             |
| `errors.ts`            | `PlacesError` mit `kind` (`network`, `timeout`, `quota`, `auth`, `not_found` …) und deutschen Meldungen für die Oberfläche                                                                                    |
| `overpass-provider.ts` | OpenStreetMap über die Overpass API: eine Abfrage pro Gebiet (10 Min. wiederverwendet), Suche, Filter und Seiten lokal, Sortierung nach Entfernung                                                            |
| `osm-mapping.ts`       | OSM-Tags → App-Modell: Art und Küche auf Deutsch, Adresse, `diet:*`, `outdoor_seating`, `dog`, `wheelchair`, `internet_access`, `smoking`, `takeaway`, `delivery`, `reservation`, `payment:*`, Öffnungszeiten |
| `routing-provider.ts`  | Wählt pro Anfrage die richtige Quelle                                                                                                                                                                         |
| `capabilities.ts`      | Was jede Quelle kann (Bewertungen, Preise, Fotos, Merkmale) – steuert Filter und Anzeige                                                                                                                      |
| `mock-data.ts`         | Beispieldaten mit Sonderfällen: wenige oder keine Bewertungen, vorübergehend oder dauerhaft geschlossen, ein Hotel als Negativbeispiel                                                                        |

**Mock-Daten:** Die Suche prüft, ob alle Wörter vorkommen, unabhängig von Groß-/Kleinschreibung und Akzenten. „vegan Kreuzberg“ findet also nur Lokale, die zu beiden Wörtern passen. Fotos sind neutrale Platzhalterbilder von picsum.photos und brauchen eine Internetverbindung.

## Datenquellen

Einstellbar unter Einstellungen → Datenquelle. „Automatisch“ nimmt Google, wenn ein API-Schlüssel gesetzt ist, sonst OpenStreetMap.

|                                  | Google Places              | OpenStreetMap         | Beispieldaten    |
| -------------------------------- | -------------------------- | --------------------- | ---------------- |
| Kosten / Schlüssel               | kostenpflichtig, Key nötig | kostenlos, ohne Key   | –                |
| Bewertungen, Vertrauensscore     | ✅                         | –                     | ✅               |
| Preise, Fotos, Rezensionen       | ✅                         | –                     | ✅               |
| Öffnungszeiten, Kontakt, Adresse | ✅                         | ✅ (wenn eingetragen) | ✅               |
| Vegetarisch, Außenplätze, Hunde  | ✅                         | ✅ (wenn eingetragen) | ✅               |
| **Vegan**                        | –                          | ✅ (`diet:vegan`)     | –                |
| Gruppen, Kinder, Mahlzeiten      | ✅                         | –                     | ✅               |
| Relevanz-Reihenfolge             | von Google                 | nach Entfernung       | Datenreihenfolge |

- **Filter je Quelle:** Filter und Sortierungen, die die aktive Quelle nicht kann, sind im Filter-Sheet ausgeblendet, tauchen nicht als Chip auf und werden bei der Suche ignoriert. Sonst würde z. B. „ab 4 ★“ bei OSM alles ausschließen. Gespeichert bleiben sie trotzdem, beim Zurückwechseln sind sie wieder aktiv.
- **Favoriten aus mehreren Quellen:** Sie funktionieren nebeneinander. Jede ID trägt ihre Quelle (`osm:…`, `mock-…`, sonst Google), Details kommen immer aus der Ursprungsquelle. Google-Favoriten brauchen dafür den Key.
- **OpenStreetMap im Detail:**
  - **Datensatz statt Live-Abfrage:** Live-Abfragen bei Overpass dauerten im Test ~38 s für 1,5 km, zu langsam für eine App. Deshalb lädt die GitHub Action „Web-App veröffentlichen“ **täglich (04:17 UTC) und bei jedem Push** alle Berliner Lokale in einer einzigen Abfrage (`scripts/fetch-osm-berlin.mjs`, Zeitlimit 10 Min., drei Server nacheinander). Sie legt sie als `data/osm-berlin.json` neben die Web-App. Gespeichert werden nur die Tags, die die App nutzt. Schlägt der Abruf fehl, bleibt der zuletzt veröffentlichte Datensatz stehen.
  - **In der App:** Der Datensatz wird einmal geladen (`EXPO_PUBLIC_OSM_DATASET_URL`, setzt `build-web.mjs` automatisch). Danach laufen Umkreis, Suchtext, Filter, Seiten, Details und Favoriten auf dem Gerät, ohne weitere Anfragen. Ist er nicht erreichbar, fragt die App live (siehe unten) und versucht den Datensatz nach 5 Minuten erneut.
  - **Live-Abfrage (Rückfall):** Eine Overpass-Abfrage holt alle Gastronomie-Orte mit Namen im Umkreis (höchstens 5 km): `amenity` = restaurant, cafe, bar, pub, biergarten, fast_food, food_court, ice_cream sowie `shop=bakery`. Das Ergebnis wird 10 Minuten wiederverwendet. Die Abfrage ist zusätzlich auf eine Kartenbox begrenzt (`[bbox:…]`, schnell auf dem Server) und hat ein Server-Limit von 15 s. Antwortet ein Server nicht innerhalb von 20 s oder ist er überlastet (429/5xx), fragt die App den nächsten (`overpass-api.de` → `overpass.private.coffee` → `overpass.kumi.systems`) und merkt sich den funktionierenden. Suchtext, Filter und Seiten laufen lokal, das schont die öffentlichen Server.
  - **Freitext:** Er sucht in Name, Art, Küche (auch deutsch: „Döner“, „japanisch“, „Kaffee“), Diät-Angaben und Straße. Ortsnamen („vegan Kreuzberg“) werden ignoriert, weil sie selten am Lokal stehen. Den Ort wählt man über die Bezirks-Chips.
  - **Öffnungszeiten:** Ein eigener Parser versteht die übliche Teilmenge des OSM-Formats (`Mo-Fr 08:00-18:00; Sa 10:00-02:00; PH off`, `24/7`). Exotische Angaben gelten als unbekannt, nicht als geschlossen.
  - **Anzeige:** keine leeren Foto- und Sternflächen, stattdessen „Keine Bewertungen (OpenStreetMap)“. Die Detailseite verlinkt den Ort auf openstreetmap.org, dort lassen sich falsche Angaben korrigieren.
  - **Lizenz:** Die Daten stehen unter ODbL. Die Quellenangabe „© OpenStreetMap-Mitwirkende“ mit Link zur Lizenz steht unter Listen und Details.

## Suche

- **Start:** Die Suche startet automatisch 400 ms nach der letzten Eingabe sowie bei jedem Wechsel von Ort oder Filtern. Die erste Suche wartet, bis Standort und gespeicherte Filter feststehen. Antworten älterer Suchen werden verworfen.
- **Suchort:** In meiner Nähe, einer von 15 Berliner Ortsteilen oder „In diesem Bereich suchen“ nach dem Verschieben der Karte. Ohne Standortfreigabe sucht die App in Berlin-Mitte und zeigt einen Hinweis mit Link zur Freigabe.
- **Ergebniskarte:** Foto (mit Fotograf), Name, Typ, Preisniveau und Entfernung (nur bei bekanntem Standort). Dazu Sterne mit Anzahl, „Wenig Datenbasis“ unter 30 Bewertungen, Öffnungs- bzw. Betriebsstatus und das Herz.
- **Karte:** Ein Tipp auf einen Pin zeigt eine kompakte Karte des Lokals, ein Tipp darauf die Details.

## Vertrauensscore

Ein bereinigter Bewertungsschnitt (Bayes), der berücksichtigt, wie viele Bewertungen hinter einem Schnitt stehen:

```
Vertrauensscore = (k · m + n · r) / (k + n)
```

- `r` ist der Google-Schnitt, `n` die Anzahl der Bewertungen.
- `m = 4,3` ist der angenommene Durchschnitt Berliner Gastronomie.
- `k = 25` ist das Gewicht dieser Annahme, also 25 gedachte Durchschnittsbewertungen.
- Beide Werte stehen in `src/utils/trust-score.ts`.

**Wirkung:** Wenige Bewertungen ziehen den Score Richtung Durchschnitt, bei vielen ändert sich kaum etwas.

| Google        | Vertrauensscore |
| ------------- | --------------- |
| 4,6 aus 1.284 | 4,6             |
| 4,8 aus 22    | 4,5             |
| 4,9 aus 12    | 4,5             |
| 5,0 aus 3     | 4,4             |
| 2,0 aus 4     | 4,0             |

**Wo er erscheint:**

- **Detailseite:** Der Score mit einem Satz Erklärung zu genau diesem Lokal und der offengelegten Berechnung.
- **Suche:** Die Sortierung „Relevanz“, „Vertrauensscore“ oder „Entfernung“ wählst du im Filter-Sheet. Sie wird gespeichert (`tablefinder.settings`) und löst keine neue Anfrage aus. Die aktive Sortierung steht als Chip neben dem Filter-Button, ein Tipp stellt zurück auf Relevanz. Beim Sortieren nach Vertrauensscore zeigt jede Karte ihren Score, damit die Reihenfolge nachvollziehbar ist.
- **Favoriten:** zusätzliche Sortierung „Vertrauensscore“ neben „Google-Bewertung“.

## Filter

| Bereich        | Filter                                                                                                                             | Wo ausgewertet                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Art            | Restaurant, Café, Bar, Bäckerei, Imbiss, Fast Food                                                                                 | API, wenn genau eine Art gewählt ist; bei mehreren in der App |
| Küche          | Italienisch, Pizza, Asiatisch, Japanisch, Vietnamesisch, Indisch, Türkisch, Orientalisch, Deutsch, Burger, Mexikanisch, Griechisch | App (Google: Ortstypen, OSM: `cuisine`)                       |
| Öffnungszeiten | Jetzt geöffnet                                                                                                                     | API (Text Search) und App                                     |
|                | Heute spät geöffnet (bis mind. 23 Uhr), Sonntags geöffnet                                                                          | App, aus den Öffnungszeiten                                   |
| Bewertung      | Mindestbewertung (3,5 / 4,0 / 4,5 ★), Mindestanzahl Bewertungen (30+ / 100+ / 500+)                                                | API und App; nur Google                                       |
| Preis          | € bis €€€€, Mehrfachauswahl                                                                                                        | API (Text Search) und App; nur Google                         |
| Umkreis        | 500 m bis 5 km                                                                                                                     | API                                                           |
| Ernährung      | Vegetarisch, Vegan, Glutenfrei, Halal                                                                                              | App; Vegan, Glutenfrei, Halal nur mit OpenStreetMap           |
| Ausstattung    | Außenplätze, hundefreundlich, barrierefrei, WLAN, rauchfrei, Gruppen, Kinder                                                       | App; WLAN/rauchfrei nur OSM, Gruppen/Kinder nur Google        |
| Service        | Zum Mitnehmen, Lieferung, Reservierung möglich, Kartenzahlung                                                                      | App                                                           |
| Mahlzeit       | Frühstück / Mittagessen / Abendessen                                                                                               | App, nur Google                                               |

- **Fehlende Angaben:** Bei Ernährung, Ausstattung, Service, Mahlzeiten und Öffnungszeiten gilt nur ein ausdrückliches „ja“. Fehlt die Angabe, fällt das Lokal heraus. Lieber ein Treffer zu wenig als ein Lokal, das sich vor Ort als unpassend herausstellt.
- **Übernahme:** Änderungen im Filter-Sheet greifen erst beim Schließen, per „Fertig“ oder Wischgeste. So löst nicht jeder einzelne Tipp eine kostenpflichtige Anfrage aus.
- **Nachladen beim Filtern:** Filtert die App selbst, lädt sie automatisch weitere Seiten, bis mindestens 8 Treffer da sind. Pro Suche sind es höchstens 3 Seiten (Kostenbremse).
- **Bedienung:** Aktive Filter stehen als Chips unter der Suche, ein Tipp entfernt sie. Ab zwei Filtern gibt es „Zurücksetzen“, im Leerzustand „Filter zurücksetzen“.
- **Speicherung:** unter `tablefinder.filters`, beim Laden wird geprüft.
- **Je Datenquelle:** Welche Filter angeboten werden, hängt von der Quelle ab (siehe [Datenquellen](#datenquellen)).

## Detailseite

- **Laden:** Beim Öffnen werden die Details frisch geladen oder aus dem 5-Minuten-Speicher geholt. Name und Foto aus der Trefferliste erscheinen sofort.
- **Status:** „Jetzt geöffnet · Schließt um 22:30“ bzw. „Geschlossen · Öffnet morgen um 12:00“. Berechnet aus den Öffnungszeiträumen, auch über Mitternacht und das Wochenende hinweg. Bei Widerspruch zur Angabe von Google (z. B. Feiertag) steht nur der Status ohne Uhrzeit da.
- **Aktionen:**
  - Route öffnet Apple Maps (iOS) bzw. die Auswahl der Karten-Apps über `geo:` (Android).
  - Anrufen startet `tel:`.
  - Website öffnet im In-App-Browser.
- **Inhalt:**
  - Bewertung mit Skala der Datenbasis (unter 30 / 30–199 / ab 200)
  - Öffnungszeiten mit hervorgehobenem heutigem Tag
  - Angebots-Merkmale mit ✓ / ✗, Adresse und Mini-Karte
  - Rezensionen, neueste zuerst, mit Autor und Quellenangabe
- **Dauerhaft geschlossen:** Solche Lokale bekommen einen deutlichen Hinweis.

## Symbolbilder (KI)

OpenStreetMap hat keine Fotos. Damit die Liste nicht leer wirkt, zeigt die App für Lokale ohne Foto ein KI-erzeugtes **Symbolbild** mit dem Hinweis „Symbolbild (KI)“.

- **Katalog:** `scripts/placeholder-catalog.json` – 23 Typen (Pizza, Italienisch, Japanisch, Vietnamesisch, Thai, Chinesisch, Koreanisch, Asiatisch, Indisch, Türkisch/Döner, Orientalisch, Deutsch, Burger, Mexikanisch, Griechisch, Restaurant, Café, Bäckerei, Bar, Kneipe, Biergarten, Eisdiele, Imbiss) mit je 6 Szenen (Gericht im Lokal, Gastraum, Außenansicht, Terrasse, vegetarisches Gericht im Lokal, Blick zum Tresen) und wechselndem Licht, aber einheitlichem Fotostil.
- **Erzeugen:** GitHub Action „Symbolbilder erzeugen“ (nur per Hand) mit `scripts/generate-placeholders.mjs` und der OpenAI-Bild-API (Secret `OPENAI_API_KEY`, ca. 138 Bilder, wenige Euro). Vorhandene Bilder werden übersprungen; `DRY_RUN` zeigt nur die Prompts. Die Bilder landen verkleinert (1200 px, WebP) in `public/placeholders/`, `src/services/placeholders/manifest.json` listet sie; danach wird die Web-App neu veröffentlicht.
- **Zuordnung:** `src/services/placeholders/placeholders.ts` – Typ aus Küche (spezifisch vor allgemein), sonst aus Art; Variante per Hash der Orts-ID, also stabil pro Lokal und verschieden zwischen Nachbarn. Terrassen-Motive nur bei Lokalen mit Außenplätzen, vegetarische Lokale bekommen häufig ein vegetarisches Motiv. Fehlt ein Typ, nimmt die App ein allgemeines Restaurant-Bild; ohne Bilder bleibt alles wie vorher.
- **Native App:** `EXPO_PUBLIC_PLACEHOLDER_BASE_URL` auf die veröffentlichte Adresse setzen (siehe `.env.example`).

## Favoriten

- **Merken:** Das Herz sitzt auf jeder Ergebniskarte, in der Kartenansicht und auf der Detailseite. Hat ein Favorit schon eigene Angaben, fragt die App vor dem Entfernen nach.
- **Meine Notizen** auf der Detailseite:
  - Zuordnung zu Listen; ein Lokal kann in mehreren stehen
  - „Schon besucht“ und eigene Bewertung (1–5, erneutes Tippen löscht sie)
  - Notiz, verzögert gespeichert
- **Favoriten-Tab:**
  - Filter nach Liste und Besuchsstatus, Sortierung nach zuletzt hinzugefügt, Name, eigener Bewertung, Google-Bewertung oder Entfernung
  - Als Liste oder Karte
  - Die Ortsdaten werden frisch geladen (`getSummary`, höchstens 4 Anfragen gleichzeitig).
  - Dauerhaft geschlossene Lokale bekommen einen roten Rahmen und ein Banner. Kennt Google eine ID nicht mehr, erscheint „Ort nicht mehr verfügbar“ mit der Möglichkeit, den Eintrag zu entfernen.
- **Verwalten:** Listen anlegen (mit Vorschlägen), umbenennen und löschen. Beim Löschen einer Liste bleiben die Favoriten erhalten.
- **Sicherung als JSON:**
  - Export über das Teilen-Menü, Import über die Dateiauswahl.
  - Format: `{ app: "tablefinder", format: "favorites", version: 1, exportedAt, lists, favorites }`. Sicherungen aus der Zeit, als die App noch „Tisch“ hieß (`app: "tisch"`), lassen sich weiterhin importieren.
  - Jeder Eintrag wird geprüft. Ungültige werden übersprungen und gezählt, Dateien aus neueren Versionen abgelehnt.
  - „Zusammenführen“: Gleichnamige Listen werden vereint, bei doppelten Favoriten gewinnt die neuere Bearbeitung.
  - „Ersetzen“ stellt die Sicherung exakt wieder her.
- **Speicherung:** unter `tablefinder.favorites`, nur `placeId`, Listen, Notiz, Besuchsstatus, eigene Bewertung und Zeitstempel.

## Einstellungen

- **Standard-Umkreis:** Gilt für neue Suchen und beim Zurücksetzen der Filter. Wurde der Umkreis im Filter nie geändert, übernimmt die Suche den neuen Wert sofort.
- **Einheiten:** Kilometer oder Meilen. Gilt überall, auch in den Texten für Screenreader.
- **Sprache:** Deutsch, auch bei den Abfragen an Google (`languageCode: de`).
- **Daten:**
  - Link zur Favoriten-Sicherung.
  - „Alle lokalen Daten löschen“ entfernt nach Rückfrage Favoriten, Listen, Notizen, Filter, Einstellungen, den Zwischenspeicher und erzeugte Sicherungsdateien.
- **Datenschutz-Hinweis:** Steht in der App und deckt sich mit dem Abschnitt [Datenschutz und Nutzungsbedingungen](#datenschutz-und-nutzungsbedingungen).

## Barrierefreiheit, Dunkelmodus, Performance

- **Kontrast:** Ein Test prüft alle Text-/Hintergrund-Paare in Hell und Dunkel gegen WCAG AA (≥ 4,5 : 1).
- **Screenreader:**
  - Jede Ergebniskarte hat ein vollständiges Label.
  - Icons sind ausgeblendet, Überschriften als `header` markiert, Chips melden ihren Zustand.
  - Trefferzahlen werden angesagt (Android per Live-Region, iOS per `announceForAccessibility`).
- **Bedienung:** Trefferflächen von mindestens 44 pt. Die Schriftgröße folgt dem System, Layouts brechen um statt abzuschneiden.
- **Bewegung reduzieren:** Ist die Systemeinstellung aktiv, entfallen Kartenschwenks und Bild-Überblendungen.
- **Dunkelmodus:** Alle Farben kommen aus Tokens in `constants/theme.ts`, auch die Karten schalten um.
- **Performance:**
  - Suche um 400 ms verzögert, Ergebnisse kurz im Speicher, gleiche Anfragen gebündelt, Paginierung.
  - Virtualisierte Listen, Bilder in passender Größe und erst bei Bedarf, Karten-Pins ohne laufende Neuberechnung.
  - Automatische Memoisierung durch den React Compiler.
- **Leer- und Fehlerzustände:**
  - Kein Netz, Zeitüberschreitung, Anfragelimit, ungültiger Key und keine Treffer.
  - Ort nicht gefunden und Ort nicht mehr verfügbar.
  - Keine Favoriten und leere Liste.

## Tests

365 Tests in 37 Dateien (`npm test`):

| Bereich                         | Was geprüft wird                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datenschicht                    | Mapping, Feldmasken, Gastro-Typen, Google-Anfragen und Fehlerzuordnung (mit simulierten Antworten), Mock, Cache                                                      |
| Filterlogik (Auftrag)           | Jeder Filter einzeln, API- vs. App-Teil, Chips, Bereinigung gespeicherter Filter, Persistenz                                                                         |
| Favoriten-Store (Auftrag)       | Hinzufügen/Entfernen, Listen, eigene Angaben, Persistenz, nur eigene Daten gespeichert, Export/Import, Zusammenführen                                                |
| Such-Flow (Smoke-Test, Auftrag) | Start ohne Standort → Treffer in Mitte → Suchbegriff ohne Treffer → Bezirk wechseln → Details öffnen                                                                 |
| Oberflächen                     | Filter-Chips, Detailseite, Herz-Button, Notizen, Favoriten-Tab, Verwalten-Sheet, Einstellungen                                                                       |
| OpenStreetMap                   | Öffnungszeiten-Parser (Mitternacht, Wochenende, Überschreiben, Unbekanntes), Mapping, Overpass-Anfragen, Suche, Cache, Fehler, Routing, Filter je Quelle, Oberfläche |
| Vertrauensscore                 | Berechnung, Grenzfälle, Umkehr der Reihenfolge, Sortierung, Anzeige auf Karten und Detailseite                                                                       |
| Logik                           | Öffnungszeiten (über Mitternacht, Wochenende), Entfernung, Einheiten, Links, Kartenausschnitt, Kontrast (WCAG)                                                       |

## Getroffene Entscheidungen

- **Ordner unter `src/`:** Die vorgegebene Struktur liegt unter `src/`, wie in der aktuellen Expo-Vorlage. Der Alias `@/` zeigt auf `src/`.
- **Navigation:** `NativeTabs` aus Expo Router, also die systemeigene Tab-Leiste. Filter und Verwaltung öffnen als natives Bottom Sheet (`formSheet`), ohne Zusatzpaket.
- **Karten:** `react-native-maps`. iOS nutzt Apple Maps (kein Key nötig), Android Google Maps.
- **Persistenz:** Zustand mit `persist` auf `expo-sqlite/kv-store`. Jeder gespeicherte Stand trägt eine Format-Version und wird beim Laden geprüft. Kaputte oder veraltete Werte führen nie zu einem Absturz.
- **Standort:** Fallback ist Berlin-Mitte (Alexanderplatz). Die App fragt nur „Beim Verwenden der App“, nie im Hintergrund.
- **Entfernung:** Sie wird nur angezeigt, wenn der eigene Standort bekannt ist, auch bei der Suche in einem Bezirk.
- **Icons:**
  - SF Symbols auf iOS, Material Symbols auf Android.
  - Material Symbols zeichnet expo-symbols nur als Umriss. Gefüllte Sterne und das gemerkte Herz sind dort deshalb Textzeichen (★, ♥︎).
- **Farbe:** ein Akzentton, Terrakotta (`#B5432A` hell, `#F0876B` dunkel).
- **Web:** vollwertige Web-App für den Home-Bildschirm (siehe [Web-App (PWA)](#web-app-pwa)), veröffentlicht über GitHub Pages.
- **Bewusst nicht umgesetzt:** Mehrsprachigkeit, eigenes Backend, Konten.

## Datenschutz und Nutzungsbedingungen

- **Kein Tracking:** Tablefinder hat keine eigenen Server, keine Konten und kein Tracking.
- **Was übertragen wird:**
  - **Google Places:** Suchbegriff und Suchort (eigener Standort oder gewählter Bezirk).
  - **OpenStreetMap:** nichts. Die App lädt den Berlin-Datensatz von ihrer eigenen Seite und sucht auf dem Gerät. Nur wenn der Datensatz nicht erreichbar ist, geht der Suchort (ohne Suchbegriff) an öffentliche Overpass-Server: `overpass-api.de`, ersatzweise `overpass.private.coffee` oder `overpass.kumi.systems`.
- **Standort:** Er wird nur während der Nutzung abgefragt und nicht gespeichert.
- **Was lokal bleibt:** nur `place_id`s und eigene Daten (Listen, Notizen, Status, eigene Bewertung, Filter, Einstellungen). Ein Test stellt sicher, dass keine Ortsdaten von Google gespeichert werden.
- **Inhalte von Google:** Bewertungen, Rezensionen und Fotos liegen nur wenige Minuten im Arbeitsspeicher, Fotos werden nicht auf dem Gerät gecacht.
- **Quellenangabe:**
  - Google: „Daten: Google Maps“ unter Listen, Fotograf auf Fotos, Autor und Quelle bei Rezensionen.
  - OSM: „© OpenStreetMap-Mitwirkende (ODbL)“ mit Link zur Lizenz.
- **Feldmasken:** Anfragen holen nur die benötigten Felder.

## Bekannte Einschränkungen

**Noch nicht verifiziert**

- **Gerät:** Die App lief noch auf keinem echten Gerät und in keinem Simulator. Geprüft sind Tests, Bundles und eine Browser-Vorschau. Offen sind vor allem Karten, Bottom Sheets, Teilen-Menü, Dateiauswahl, Standortabfrage, Screenreader und große Schrift.
- **Echte API:** Der Google-Anbieter ist nur gegen die dokumentierten API-Formate getestet, mit simulierten Antworten. Feldnamen und Typ-Listen sollten beim ersten Lauf mit echtem Key geprüft werden.
- **OpenStreetMap live:** Die Overpass API war aus der Bau-Umgebung gesperrt. Anbieter, Mapping und Öffnungszeiten-Parser sind gegen das dokumentierte Format getestet, mit nachgebauten Antworten (`src/__tests__/fixtures/overpass.ts`). Beim ersten echten Lauf sind Antwortzeiten, Datenmenge bei 5 km und die tatsächliche Abdeckung von `diet:vegan` und `opening_hours` in Berlin zu prüfen.
- **`expo-doctor`:** 18 von 20 Prüfungen sind bestanden. Die beiden übrigen brauchen die Expo-Server, die beim Bau nicht erreichbar waren.

**Grenzen der Places API**

- **Sterne:** Es gibt keine Verteilung nach Sternen, nur Schnitt und Anzahl. Daher zeigt die App die Skala der Datenbasis.
- **Rezensionen:** höchstens 5 pro Ort, von Google nach Relevanz ausgewählt. Die App sortiert sie nach Datum.
- **Seitenanzahl:**
  - Die Umgebungssuche (ohne Begriff) liefert höchstens 20 Treffer und kein Nachladen.
  - Die Textsuche liefert bis zu 60 Treffer.
  - Die Textsuche lässt sich nur auf ein Rechteck begrenzen. Treffer außerhalb des Kreises filtert die App heraus, Seiten können daher kürzer sein.
- **Vegan, glutenfrei, halal, WLAN, rauchfrei:** Kennt Google nicht. Diese Filter gibt es daher nur mit OpenStreetMap.
- **Mindestbewertung:** Sie wird wie bei Google auf halbe Sterne abgerundet (4,7 → 4,5).
- **Teure Filter:** Merkmal-Filter (vegetarisch, Außenplätze …) lösen bei Google eine teurere Abrechnungsstufe aus.

**Grenzen von OpenStreetMap**

- **Datenqualität:** Die Daten pflegen Freiwillige. Öffnungszeiten, Diät-Angaben und geschlossene Lokale sind nicht immer aktuell, viele Lokale haben solche Angaben gar nicht.
- **Keine Bewertungen:** Bei OSM gibt es keine Bewertungen, Preise, Fotos oder Rezensionen, damit entfallen auch Vertrauensscore und Bewertungsfilter.
- **Aktualität:** Der Datensatz ist bis zu einen Tag alt (täglicher Abruf).
- **Öffentliche Overpass-Server:** Sie sind kostenlos, aber begrenzt (Fair Use) und für Live-Abfragen oft zu langsam (gemessen: ~38 s für 1,5 km). Die App nutzt sie nur als Rückfall, wenn der Datensatz fehlt.
- **Native App:** Sie braucht `EXPO_PUBLIC_OSM_DATASET_URL` mit der vollen Adresse (siehe `.env.example`), sonst fragt sie live.
- **Radius und Suche:** höchstens 5 km Umkreis. Die Suche findet nur Lokale mit Namen und erkennt „Prenzlauer Berg“ & Co. nicht im Suchtext.
- **Keine Kombination:** Google und OSM werden nicht zusammengeführt, die Suche läuft immer über eine Quelle.

**Folgen der Nutzungsbedingungen**

- **Offline:** Favoriten zeigen ohne Internet keine Namen, weil Ortsdaten nicht dauerhaft gespeichert werden dürfen.
- **Wechselnde IDs:** Google-IDs können sich ändern. Solche Favoriten erscheinen als „Ort nicht mehr verfügbar“.

**Sonstiges**

- **API-Key in der App:** Der Key steckt im App-Paket und in Foto-URLs. Für den persönlichen Gebrauch reichen Einschränkung und Kontingent.
- **Gerätezeit:** Öffnungszeiten-Hinweise („schließt um …“) rechnen mit der Gerätezeit, nicht mit Berliner Zeit.
- **Meilen:** Die Umkreis-Stufen sind metrisch und werden nur umgerechnet angezeigt (0,3 / 0,6 / 0,9 / 1,9 / 3,1 mi).
- **Web-App gegenüber nativer App:**
  - Die Tab-Leiste ist nachgebaut, nicht das iOS-System-Element.
  - Kein Offline-Modus (ohne Internet ist die Suche ohnehin nicht möglich).
  - Favoriten verschwinden, wenn man in Safari die Website-Daten löscht.
  - Die Web-App lief nur in einer iPhone-Emulation (Chromium), noch nicht in echtem Safari auf einem iPhone.
- **Kartenstil:** Vektorkarten von [OpenFreeMap](https://openfreemap.org) (Stil Positron, im Dunkelmodus Dark), gezeichnet mit MapLibre GL innerhalb von Leaflet. Kein Konto, kein Schlüssel, kein Limit; der Dienst ist aber ohne Garantie. Ohne WebGL oder wenn der Stil nicht lädt, zeigt die App die OSM-Standardkacheln. Den Stil ändert man in `src/components/place/map-style.ts`.
- **Sortierung:** Nach Vertrauensscore oder Entfernung wird in der App sortiert, nur über die bereits geladenen Treffer. Beim Nachladen ordnen sich neue Treffer ein. Google kann nicht nach Bewertung sortieren.
- **Annahme im Vertrauensscore:** Der Durchschnitt 4,3 ist fest angenommen, nicht aus echten Daten ermittelt. Mit echtem Key lohnt es sich, ihn anhand eigener Suchergebnisse zu prüfen.

## Nächste Schritte

Nach Priorität:

1. **Auf dem Gerät testen, mit echtem Key**
   - Development Build mit `npx expo run:ios` / `run:android` oder EAS (`eas.json` anlegen).
   - Einmal alle Abläufe durchgehen, VoiceOver/TalkBack und große Schrift prüfen.
   - Ersten Lauf gegen die echte Places API beobachten: Feldnamen, Typen, Kosten pro Suche in der Cloud Console.
2. **OSM-Datensatz beobachten:** Im Protokoll der Action „Web-App veröffentlichen“ steht beim Schritt „OpenStreetMap-Datensatz für Berlin laden“, wie viele Orte geladen wurden und wie groß die Datei ist.
3. **API-Key aus der App nehmen**, sobald die App nicht mehr nur privat genutzt wird. Ein kleiner Proxy (z. B. Cloudflare Worker) hält den Key, setzt Feldmasken serverseitig und begrenzt Anfragen pro Gerät. Die App ändert dafür nur die Basis-URL im `GooglePlacesProvider`. Für den persönlichen Gebrauch nicht nötig.
4. **Ende-zu-Ende-Tests** mit Maestro für die Hauptabläufe auf Simulator/Emulator.

### Ideen aus dem Auftrag (bewertet)

| Idee                               | Einschätzung                                                                                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zweite Datenquelle (OpenStreetMap) | ✅ Umgesetzt (siehe [Datenquellen](#datenquellen)). Nächster Schritt wäre die Kombination: Google-Treffer mit OSM-Angaben (vegan) anreichern, über Name und Entfernung abgeglichen.                                                                             |
| Gerichte-Suche                     | Die Places API hat keine Speisekarten. Möglich ist nur die Freitextsuche („Ramen“), die schon funktioniert. Mehr bräuchte eine eigene Datenquelle.                                                                                                              |
| Vertrauensscore für Bewertungen    | ✅ Umgesetzt (siehe [Vertrauensscore](#vertrauensscore)).                                                                                                                                                                                                       |
| Teilen von Listen                  | Ohne Backend über die vorhandene JSON-Sicherung oder einen Deep Link mit `place_id`s (`tablefinder://liste?…`). Es dürfen keine Google-Inhalte mitgeschickt werden, die IDs schon.                                                                              |
| Widget „Was esse ich heute?“       | Machbar mit `expo-widgets` (für SDK 58 verfügbar, nicht ausprobiert) bzw. einem nativen Widget-Target. Zufallsvorschlag aus „Noch ausprobieren“, der jetzt geöffnet ist. Braucht einen Development Build und frische Daten beim Antippen (Nutzungsbedingungen). |
