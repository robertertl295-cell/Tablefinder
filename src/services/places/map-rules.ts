import type { DataSource } from '@/types/place';

/**
 * Google-Maps-Platform-Bedingungen für den Europäischen Wirtschaftsraum (gelten für dieses
 * Projekt, seit 8. Juli 2025): Inhalte der Places API dürfen – außer Koordinaten und place_id –
 * nicht zusammen mit einer Karte gezeigt werden, auch nicht mit Google Maps.
 * Erlaubt: Punkte auf der Karte (nur Koordinaten), Name/Bewertung in Liste und Detailseite ohne Karte.
 * OpenStreetMap- und Beispieldaten sind davon nicht betroffen.
 */
export function mayShowDetailsOnMap(source: DataSource): boolean {
  return source !== 'google';
}
