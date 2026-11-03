import type { FavoritesBackup } from '@/types/favorites';
import { parseBackup, type ParseResult } from '@/utils/favorites';

/** Web-Vorschau: Download statt Teilen-Menü, Datei-Input statt Dokumentauswahl. */
export function backupFileName(backup: FavoritesBackup): string {
  return `tablefinder-favoriten-${backup.exportedAt.slice(0, 10)}.json`;
}

export async function shareBackup(backup: FavoritesBackup): Promise<'shared' | 'unavailable'> {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = backupFileName(backup);
  a.click();
  URL.revokeObjectURL(a.href);
  return 'shared';
}

export function pickBackup(): Promise<ParseResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? parseBackup(await file.text()) : null);
    };
    input.click();
  });
}

export function deleteBackupFiles(): void {
  // Im Browser landen Sicherungen im Download-Ordner, nicht in der App.
}
