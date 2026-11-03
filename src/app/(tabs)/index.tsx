import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { config } from '@/services/config';

export default function SearchScreen() {
  const source = config.dataSource === 'mock' ? 'Mock-Daten (kein API-Key)' : 'Google Places';
  return (
    <ScreenPlaceholder
      title="Suche"
      description={`Restaurants, Cafés und Bars in Berlin finden. Datenquelle: ${source}.`}
    />
  );
}
