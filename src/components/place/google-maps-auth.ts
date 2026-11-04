import { useSyncExternalStore } from 'react';

/**
 * Google ruft bei ungültigem oder gesperrtem Key (falsche Website, kein Guthaben, API aus)
 * die globale Funktion `gm_authFailure` auf und zeigt sonst nur „Hoppla! Ein Fehler …“.
 * Wir merken uns das und schalten die Karten auf OpenFreeMap zurück.
 */
let failed = false;
const listeners = new Set<() => void>();

function install() {
  const w = globalThis as unknown as { gm_authFailure?: () => void };
  if (typeof w !== 'object' || w.gm_authFailure) return;
  w.gm_authFailure = () => {
    failed = true;
    console.warn('Google Maps: Schlüssel abgelehnt – Karte fällt auf OpenFreeMap zurück.');
    listeners.forEach((l) => l());
  };
}

export function useGoogleMapsFailed(): boolean {
  install();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => failed,
    () => failed,
  );
}
