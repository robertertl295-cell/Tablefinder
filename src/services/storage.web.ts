import { createJSONStorage } from 'zustand/middleware';

/**
 * Web-Variante (nur für die Browser-Vorschau): localStorage statt SQLite,
 * weil expo-sqlite im Browser eine eigene WebAssembly-Konfiguration bräuchte.
 */
export const persistStorage = createJSONStorage(() => globalThis.localStorage);
