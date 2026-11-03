import { PLACES_ERROR_MESSAGE, type PlacesError } from '@/services/places/errors';

import { StateMessage } from './state-message';

const TITLE: Partial<Record<PlacesError['kind'], string>> = {
  network: 'Keine Verbindung',
  timeout: 'Zeitüberschreitung',
  quota: 'Anfragelimit erreicht',
  auth: 'API-Schlüssel ungültig',
};

export function SearchError({ error, onRetry }: { error: PlacesError; onRetry: () => void }) {
  return (
    <StateMessage
      icon={error.kind === 'network' || error.kind === 'timeout' ? 'offline' : 'warning'}
      title={TITLE[error.kind] ?? 'Suche fehlgeschlagen'}
      message={PLACES_ERROR_MESSAGE[error.kind]}
      actionLabel={error.kind === 'auth' ? undefined : 'Erneut versuchen'}
      onAction={onRetry}
    />
  );
}
