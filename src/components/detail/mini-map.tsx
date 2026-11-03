import { Pressable, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/types/place';
import { regionForRadius } from '@/utils/map-region';

/** Kleine, nicht bewegliche Karte; Antippen startet die Route. */
export function MiniMap({ location, onPress }: { location: LatLng; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Karte, öffnet die Route"
      style={styles.frame}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={regionForRadius(location, 250)}
        liteMode
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        pointerEvents="none">
        <Marker coordinate={location} pinColor={theme.accent} tracksViewChanges={false} />
      </MapView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { height: 160, borderRadius: Radius.medium, overflow: 'hidden' },
});
