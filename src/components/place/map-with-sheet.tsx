import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LatLng, PlaceSummary } from '@/types/place';

import { MapSheet } from './map-sheet';
import { ResultsMap } from './results-map';

type Props = {
  places: PlaceSummary[];
  center: LatLng;
  radiusMeters: number;
  userLocation: LatLng | null;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  topInset?: number;
  summary: string;
  onEndReached?: () => void;
  /** Schwebt über der Karte (z. B. die Kopfzeile des Karten-Tabs). */
  overlay?: ReactNode;
};

/**
 * Karte mit Leiste darunter. Die Leiste liegt nicht über der Karte, sondern darunter –
 * so bleiben Quellenangabe und Google-Logo der Karte sichtbar. Hochgezogen deckt sie alles ab.
 */
export function MapWithSheet({ summary, onEndReached, overlay, ...map }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const select = (p: PlaceSummary | null) => setSelectedId(p?.id ?? null);
  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <ResultsMap {...map} selectedId={selectedId} onSelectPlace={select} />
        {overlay}
      </View>
      <MapSheet
        places={map.places}
        userLocation={map.userLocation}
        selectedId={selectedId}
        onSelect={select}
        summary={summary}
        onEndReached={onEndReached}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
