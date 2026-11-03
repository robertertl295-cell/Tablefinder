# Tisch

Mobile App (iOS und Android) zur Suche nach Restaurants, Cafés, Bars, Bäckereien und Imbissen in Berlin. Für den persönlichen Gebrauch.

**Funktionen:** Suche, feine Filter, Detailansicht, Favoriten mit eigenen Listen und Notizen.
**Bewusst nicht enthalten:** Reservierung, Lieferung, Bezahlung, Social Feed, Nutzerkonten.

## Stand

| Phase | Inhalt                                                 | Status |
| ----- | ------------------------------------------------------ | ------ |
| 1     | Setup, Struktur, Linting, README                       | ✅     |
| 2     | Datenschicht (`PlacesProvider`, Mock-Daten, Tests)     | ✅     |
| 3     | Suche, Liste und Karte, Standort                       | ✅     |
| 4     | Filter mit Chips und Persistenz                        | offen  |
| 5     | Detailseite                                            | offen  |
| 6     | Favoriten und Listen, Export/Import                    | offen  |
| 7     | Feinschliff (Dark Mode, Barrierefreiheit, Performance) | offen  |
| 8     | Abschluss                                              | offen  |

## Schnellstart

Voraussetzungen: Node.js 20 oder neuer, npm, ein iOS-Simulator (macOS mit Xcode) oder ein Android-Emulator.

```bash
npm install
cp .env.example .env     # Keys optional, siehe unten
npm start                # danach i (iOS) oder a (Android) drücken
```

Ohne API-Key läuft die App mit Mock-Daten.

**Expo Go oder Development Build:** `react-native-maps` und `expo-sqlite` sind in Expo Go enthalten. Für einen eigenen Google-Maps-Key auf Android und für Produktions-Builds braucht es einen Development Build:

```bash
npx expo run:ios
npx expo run:android
```

## API-Keys

Keys stehen ausschließlich in `.env`. Diese Datei ist in `.gitignore` eingetragen und wird nie committet.

| Variable                      | Wofür                                                                        | Pflicht                     |
| ----------------------------- | ---------------------------------------------------------------------------- | --------------------------- |
| `EXPO_PUBLIC_PLACES_API_KEY`  | Google Places API (New): Text Search, Nearby Search, Place Details, Fotos    | nein (ohne Key: Mock-Daten) |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Google Maps SDK for Android, wird beim Build über `app.config.ts` eingesetzt | nur für Android-Builds      |

So legst du den Places-Key an:

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen und die Abrechnung aktivieren.
2. **Places API (New)** aktivieren. Für Android zusätzlich **Maps SDK for Android**.
3. Einen API-Key erstellen und **einschränken**:
   - API-Einschränkung: nur „Places API (New)“.
   - App-Einschränkung: iOS-Bundle-ID bzw. Android-Paketname `de.tisch.app` (für Android zusätzlich der SHA-1-Fingerabdruck).
4. Ein Tageskontingent (Quota) setzen, um die Kosten zu begrenzen.

> ⚠️ Variablen mit `EXPO_PUBLIC_` werden ins App-Paket eingebaut und lassen sich daraus auslesen. Die Einschränkungen und das Tageskontingent sind deshalb Pflicht. Langfristig wäre ein kleiner Proxy-Server ohne Key im Client sinnvoll (wird in Phase 8 bewertet).

## Skripte

| Befehl              | Zweck                                        |
| ------------------- | -------------------------------------------- |
| `npm start`         | Dev-Server starten                           |
| `npm run typecheck` | TypeScript prüfen (strict)                   |
| `npm run lint`      | ESLint (Expo-Konfiguration + Prettier)       |
| `npm run format`    | Code mit Prettier formatieren                |
| `npm test`          | Jest-Tests                                   |
| `npm run check`     | Typecheck, Lint und Tests in einem Durchlauf |

## Projektstruktur

```
src/
  app/                  Expo Router: jede Datei ist ein Screen
    _layout.tsx           Root-Stack (Tabs + Detailseite)
    (tabs)/_layout.tsx    Tab-Leiste: Suche, Karte, Favoriten, Einstellungen
    (tabs)/index.tsx      Suche
    (tabs)/map.tsx        Karte
    (tabs)/favorites.tsx  Favoriten
    (tabs)/settings.tsx   Einstellungen
    place/[id].tsx        Detailseite
  components/           Wiederverwendbare UI-Bausteine
  constants/theme.ts    Farben (hell/dunkel), Abstände, Radien
  hooks/                z. B. useTheme
  services/             Konfiguration, später PlacesProvider, Cache, Standort, Export
  store/                Zustand-Stores (Suche, Filter, Favoriten, Einstellungen)
  types/                Gemeinsame TypeScript-Typen
  utils/                Reine Hilfsfunktionen (Entfernung, Öffnungszeiten …)
  __tests__/            Jest-Tests
app.config.ts           Expo-Konfiguration, liest Keys aus der Umgebung
```

## Getroffene Entscheidungen

- **Ordner unter `src/`:** Die vorgegebene Struktur (`/app`, `/components`, `/services`, `/store`, `/types`) liegt unter `src/`. Das ist die Konvention der aktuellen Expo-Vorlage. Der Alias `@/` zeigt auf `src/`.
- **Tabs:** `NativeTabs` aus Expo Router, also die systemeigene Tab-Leiste. Icons: SF Symbols auf iOS, Material Icons auf Android.
- **Karten:** `react-native-maps`. iOS nutzt Apple Maps (kein Key nötig), Android Google Maps.
- **Persistenz:** Zustand mit `persist`. Als Speicher dient `expo-sqlite/kv-store`, ein AsyncStorage-kompatibler Key-Value-Speicher auf SQLite-Basis. So ist keine weitere native Abhängigkeit nötig.
- **Standard-Standort:** Berlin-Mitte (Alexanderplatz), wenn keine Standortfreigabe vorliegt. Die App fragt nur „Beim Verwenden der App“ nach dem Standort, nie im Hintergrund.
- **Akzentfarbe:** Terrakotta (`#B5432A` hell, `#F0876B` dunkel). Alle Text-/Hintergrund-Kombinationen erreichen mindestens WCAG AA.
- **Web:** Kein Ziel der App. Die Web-Konfiguration bleibt nur für eine schnelle Vorschau im Browser. Die Karte zeigt dort einen Hinweis (`results-map.web.tsx`), weil `react-native-maps` im Browser nicht läuft.
- **Suche:** Sie startet automatisch 400 ms nach der letzten Eingabe sowie bei jedem Wechsel von Ort oder Radius. Die erste Suche wartet, bis feststeht, ob ein Standort vorliegt, damit keine überflüssige Anfrage für Berlin-Mitte rausgeht. Antworten älterer Suchen werden verworfen.
- **Entfernung:** Sie wird nur angezeigt, wenn der eigene Standort bekannt ist, auch bei der Suche in einem Bezirk. Ein Abstand zum Mittelpunkt eines Bezirks wäre für die Entscheidung wenig hilfreich.
- **Karte:** Ein Tipp auf einen Pin öffnet unten eine kompakte Karte des Lokals, ein Tipp darauf die Details. Nach dem Verschieben oder Zoomen erscheint „In diesem Bereich suchen“.
- **Fotos:** Sie werden über `expo-image` erst beim Anzeigen geladen. Google-Fotos werden nur im Arbeitsspeicher gecacht, nicht auf dem Gerät gespeichert. Der Fotograf steht im Bild.

## Datenschicht

Alles liegt unter `src/services/places/`. Die Oberfläche spricht nur das Interface `PlacesProvider` an (`search`, `getDetails`, `getPhotoUrl`) und bekommt eigene Typen aus `src/types/place.ts`. Google-Formate dringen nicht nach außen.

```
placesProvider (index.ts)
└── CachedPlacesProvider        Cache: Suche 2 Min., Details 5 Min.; bündelt gleichzeitige Anfragen
    ├── GooglePlacesProvider    wenn EXPO_PUBLIC_PLACES_API_KEY gesetzt ist
    └── MockPlacesProvider      sonst: 18 erfundene Berliner Lokale
```

| Datei                | Aufgabe                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.ts`        | Interface und `SearchQuery` / `SearchResult`                                                                                                                  |
| `google-provider.ts` | Text Search (mit Suchbegriff), Nearby Search (ohne Suchbegriff), Place Details, Foto-URLs, Timeout nach 10 s                                                  |
| `field-masks.ts`     | Feldmasken. Angebots-Merkmale (vegetarisch, Außenplätze …) werden nur mit `includeAttributes: true` geladen, weil sie eine teurere Abrechnungsstufe auslösen. |
| `mapping.ts`         | Wandelt Google-Formate in eigene Typen um. Fehlende Angaben werden `null`, nie geraten.                                                                       |
| `place-types.ts`     | Welche Typen als Gastronomie gelten. Maßgeblich ist der Haupttyp, so fliegt z. B. ein Hotel mit Restaurant raus.                                              |
| `query-filter.ts`    | Gemeinsame Prüfung (Gastronomie, Radius, Kategorie, Bewertung, Preis, geöffnet) für alle Anbieter                                                             |
| `errors.ts`          | `PlacesError` mit `kind` (`network`, `timeout`, `quota`, `auth`, `not_found` …) und deutschen Meldungen für die Oberfläche                                    |
| `mock-data.ts`       | Beispieldaten mit Sonderfällen: wenige oder keine Bewertungen, vorübergehend oder dauerhaft geschlossen, ein Hotel als Negativbeispiel                        |

**Mock-Daten:** Die Suche prüft, ob alle Wörter vorkommen, unabhängig von Groß-/Kleinschreibung und Akzenten. „vegan Kreuzberg“ findet also nur Lokale, die zu beiden Wörtern passen. Fotos sind neutrale Platzhalterbilder von picsum.photos und brauchen eine Internetverbindung.

## Daten und Nutzungsbedingungen

- Lokal gespeichert werden nur `place_id`s und eigene Daten (Listen, Notizen, Status, eigene Bewertung).
- Inhalte aus Google Places (Bewertungen, Rezensionen, Fotos) werden nicht dauerhaft gespeichert, sondern nur wenige Minuten im Arbeitsspeicher zwischengespeichert.
- Wo Google es vorschreibt, zeigt die App eine Quellenangabe.
- Anfragen nutzen Feldmasken, damit nur die benötigten Felder abgerufen werden (das senkt die Kosten).

## Bekannte Einschränkungen

Diese Liste wird bis Phase 8 fortlaufend ergänzt.

- Die Places API liefert keine Verteilung der Sterne, sondern nur den Durchschnitt, die Anzahl und höchstens 5 Rezensionen. Statt einer Sterneverteilung zeigt die App deshalb an, wie belastbar die Datenbasis ist.
- Nearby Search liefert höchstens 20 Treffer und kein Nachladen. Text Search liefert bis zu 60 Treffer über ein Seiten-Token.
- Einen eigenen Filter „vegan“ gibt es nicht, die API kennt nur `servesVegetarianFood`.
- Text Search lässt sich nur auf ein Rechteck begrenzen. Treffer in den Ecken außerhalb des Radius filtert die App danach heraus, sodass eine Seite auch weniger als 20 Treffer enthalten kann.
- Die Mindestbewertung wird wie bei Google auf 0,5er-Schritte abgerundet (4,7 → 4,5).
- Foto-URLs enthalten den API-Key. Das ist bei der Places API so vorgesehen und ein weiterer Grund für die Key-Einschränkung.
- Der Google-Anbieter ist bisher nur gegen die dokumentierten API-Formate getestet (mit simulierten Antworten), noch nicht gegen die echte API.
