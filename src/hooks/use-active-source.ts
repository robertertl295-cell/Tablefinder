import { placesProvider } from '@/services/places';
import { SOURCE_CAPABILITIES, type SourceCapabilities } from '@/services/places/capabilities';
import { useSettings } from '@/store/settings-store';
import type { DataSource } from '@/types/place';

/** Aktive Suchquelle; aktualisiert sich, wenn die Einstellung wechselt. */
export function useActiveSource(): DataSource {
  useSettings((s) => s.dataSource); // nur für die Aktualisierung
  return placesProvider.source;
}

export function useSourceCapabilities(): SourceCapabilities {
  return SOURCE_CAPABILITIES[useActiveSource()];
}
