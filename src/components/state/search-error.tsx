import { PLACES_ERROR_MESSAGE, type PlacesError } from '@/services/places/errors';
import type { DataSource } from '@/types/place';

import { StateMessage } from './state-message';

const TITLE: Partial<Record<PlacesError['kind'], string>> = {
  network: 'Keine Verbindung',
  timeout: 'Zeitüberschreitung',
  quota: 'Anfragelimit erreicht',
  auth: 'API-Schlüssel ungültig',
};

/** Bei OSM liegt es meist an ausgelasteten öffentlichen Servern, nicht am eigenen Netz. */
const OSM_BUSY =
  'Die öffentlichen OpenStreetMap-Server sind gerade ausgelastet. Bitte gleich noch einmal versuchen.';

export function SearchError({
  error,
  onRetry,
  source,
}: {
  error: PlacesError;
  onRetry: () => void;
  source?: DataSource;
}) {
  const osmBusy =
    source === 'osm' &&
    (error.kind === 'timeout' || error.kind === 'quota' || error.kind === 'server');
  return (
    <StateMessage
      icon={error.kind === 'network' || error.kind === 'timeout' ? 'offline' : 'warning'}
      title={osmBusy ? 'Server ausgelastet' : (TITLE[error.kind] ?? 'Suche fehlgeschlagen')}
      message={osmBusy ? OSM_BUSY : PLACES_ERROR_MESSAGE[error.kind]}
      actionLabel={error.kind === 'auth' ? undefined : 'Erneut versuchen'}
      onAction={onRetry}
    />
  );
}
