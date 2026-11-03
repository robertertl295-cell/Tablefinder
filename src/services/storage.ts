import KVStorage from 'expo-sqlite/kv-store';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Dauerhafter Key-Value-Speicher (SQLite) für eigene Daten: Filter, Favoriten, Einstellungen.
 * Hier niemals Inhalte aus Google Places ablegen – nur eigene Daten und place_ids.
 */
export const persistStorage = createJSONStorage(() => ({
  getItem: (key: string) => KVStorage.getItem(key),
  setItem: (key: string, value: string) => KVStorage.setItem(key, value),
  removeItem: (key: string) => KVStorage.removeItem(key),
}));
