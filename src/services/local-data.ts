import { deleteBackupFiles } from '@/services/favorites-file';
import { placesProvider } from '@/services/places';
import { favoritesStore } from '@/store/favorites-store';
import { filterStore } from '@/store/filter-store';
import { placeLinksStore } from '@/store/place-links-store';
import { searchStore } from '@/store/search-store';
import { settingsStore } from '@/store/settings-store';

/**
 * Löscht alle lokal gespeicherten Daten: Favoriten, Listen, Notizen, Filter,
 * Einstellungen, zwischengespeicherte Ortsdaten und erzeugte Sicherungsdateien.
 * Die Stores schreiben ihre Standardwerte danach selbst in den Speicher.
 */
export function deleteAllLocalData(): void {
  favoritesStore.getState().clearAll();
  settingsStore.getState().reset();
  filterStore.getState().reset(); // nach den Einstellungen → Standard-Radius stimmt
  searchStore.getState().setText('');
  placesProvider.clear();
  placeLinksStore.getState().clear();
  deleteBackupFiles();
}
