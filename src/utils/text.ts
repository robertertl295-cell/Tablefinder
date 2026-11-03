/** Kleinbuchstaben, ohne Akzente: „Café“ → „cafe“. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Suchbegriff in normalisierte Wörter zerlegen. */
export function searchTokens(text: string | undefined): string[] {
  return normalizeText(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
}
