import 'leaflet/dist/leaflet.css';

import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

import { MAP_ATTRIBUTION, MAP_TILE_SUBDOMAINS, mapTilesUrl } from '@/components/place/map-tiles';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/types/place';

/** Kleine, feste Karte für die Web-App; Antippen startet die Route. */
export function MiniMap({ location, onPress }: { location: LatLng; onPress: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.frame}>
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%', background: theme.backgroundElement }}
        className={dark ? 'tf-map-dark' : undefined}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}>
        <TileLayer
          key={dark ? 'dark' : 'light'}
          url={mapTilesUrl(dark)}
          subdomains={MAP_TILE_SUBDOMAINS}
          attribution={MAP_ATTRIBUTION}
        />
        <CircleMarker
          center={[location.latitude, location.longitude]}
          radius={10}
          pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: theme.accent, fillOpacity: 1 }}
        />
      </MapContainer>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Karte, öffnet die Route"
        style={styles.overlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 160, borderRadius: Radius.medium, overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 },
});
