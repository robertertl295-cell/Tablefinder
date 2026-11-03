import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { FavoritesBackup } from '@/types/favorites';
import { parseBackup, type ParseResult } from '@/utils/favorites';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function backupFileName(backup: FavoritesBackup): string {
  return `tablefinder-favoriten-${backup.exportedAt.slice(0, 10)}.json`;
}

/**
 * Schreibt die Sicherung als JSON in den Cache und öffnet das Teilen-Menü
 * (Dateien sichern, AirDrop, Mail …).
 */
export async function shareBackup(backup: FavoritesBackup): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, backupFileName(backup));
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(backup, null, 2));
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Favoriten sichern',
  });
  return 'shared';
}

/** Lässt eine Sicherungsdatei auswählen und prüft sie. `null` = abgebrochen. */
export async function pickBackup(): Promise<ParseResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if (asset.size !== undefined && asset.size > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Die Datei ist zu groß für eine Favoriten-Sicherung.' };
  }
  try {
    return parseBackup(await new File(asset.uri).text());
  } catch {
    return { ok: false, error: 'Die Datei konnte nicht gelesen werden.' };
  }
}

/** Entfernt erzeugte Sicherungsdateien aus dem Cache (beim Löschen aller Daten). */
export function deleteBackupFiles(): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && /^(tablefinder|tisch)-favoriten-/.test(entry.name))
        entry.delete();
    }
  } catch {
    // Cache nicht lesbar – nichts zu tun, das System räumt ihn ohnehin auf.
  }
}
