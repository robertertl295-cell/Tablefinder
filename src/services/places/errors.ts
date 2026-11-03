export type PlacesErrorKind =
  'network' | 'timeout' | 'quota' | 'auth' | 'invalid_request' | 'not_found' | 'server' | 'unknown';

export class PlacesError extends Error {
  readonly kind: PlacesErrorKind;
  readonly status: number | null;

  constructor(kind: PlacesErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'PlacesError';
    this.kind = kind;
    this.status = status;
    // Sicherstellen, dass instanceof auch nach Transpilierung funktioniert.
    Object.setPrototypeOf(this, PlacesError.prototype);
  }
}

export function isPlacesError(error: unknown): error is PlacesError {
  return error instanceof PlacesError;
}

/** Nutzerfreundliche Meldung für die Oberfläche. */
export const PLACES_ERROR_MESSAGE: Record<PlacesErrorKind, string> = {
  network: 'Keine Internetverbindung. Bitte prüfe dein Netz und versuche es erneut.',
  timeout: 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.',
  quota: 'Das Anfragelimit ist erreicht. Bitte versuche es später noch einmal.',
  auth: 'Der API-Schlüssel ist ungültig oder nicht freigeschaltet.',
  invalid_request: 'Die Suche konnte nicht verarbeitet werden.',
  not_found: 'Dieser Ort wurde nicht gefunden.',
  server: 'Der Dienst ist gerade nicht erreichbar. Bitte versuche es später erneut.',
  unknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
};

export function toPlacesError(error: unknown): PlacesError {
  if (isPlacesError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new PlacesError('unknown', message);
}
