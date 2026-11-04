/**
 * Feldmasken bestimmen, welche Felder Google liefert – und damit die Abrechnungsstufe.
 * Nur anfragen, was die Oberfläche wirklich anzeigt.
 */

/** Felder für eine Ergebniskarte in der Liste. */
export const SUMMARY_FIELDS = [
  'id',
  'displayName',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'location',
  'shortFormattedAddress',
  'rating',
  'userRatingCount',
  'priceLevel',
  'businessStatus',
  'currentOpeningHours.openNow',
  'currentOpeningHours.periods',
  'photos',
] as const;

/** Angebots-Merkmale – höhere Abrechnungsstufe, daher nur bei Bedarf. */
export const ATTRIBUTE_FIELDS = [
  'servesVegetarianFood',
  'outdoorSeating',
  'allowsDogs',
  'goodForGroups',
  'goodForChildren',
  'servesBreakfast',
  'servesLunch',
  'servesDinner',
  'takeout',
  'delivery',
  'reservable',
  'accessibilityOptions',
  'paymentOptions',
] as const;

/** Zusätzliche Felder für die Detailseite. */
export const DETAIL_ONLY_FIELDS = [
  'formattedAddress',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'currentOpeningHours',
  'regularOpeningHours',
  'reviews',
] as const;

/** Feldmaske für Text Search / Nearby Search (Felder mit Präfix `places.`). */
export function searchFieldMask(options: {
  includeAttributes: boolean;
  withPageToken: boolean;
}): string {
  const fields: string[] = [...SUMMARY_FIELDS];
  if (options.includeAttributes) fields.push(...ATTRIBUTE_FIELDS);
  const mask = fields.map((f) => `places.${f}`);
  if (options.withPageToken) mask.push('nextPageToken');
  return mask.join(',');
}

/** Feldmaske für Place Details. `currentOpeningHours` ersetzt dort `currentOpeningHours.openNow`. */
export function detailsFieldMask(): string {
  const summary = SUMMARY_FIELDS.filter((f) => !f.startsWith('currentOpeningHours.'));
  return [...summary, ...ATTRIBUTE_FIELDS, ...DETAIL_ONLY_FIELDS].join(',');
}

/** Feldmaske für einen einzelnen Ort in Kartenform (Place Details ohne Rezensionen/Kontakt). */
export function summaryFieldMask(): string {
  return SUMMARY_FIELDS.join(',');
}
