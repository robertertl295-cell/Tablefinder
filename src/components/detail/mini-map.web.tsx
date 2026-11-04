import 'leaflet/dist/leaflet.css';

import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { CircleMarker, MapContainer } from 'react-leaflet';

import {
  AdvancedMarker,
  APIProvider,
  ColorScheme,
  Map as GoogleMap,
} from '@vis.gl/react-google-maps';

import { BaseMap } from '@/components/place/base-map.web';
import { useGoogleMapsFailed } from '@/components/place/google-maps-auth';
import { config } from '@/services/config';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/types/place';

/** Kleine, feste Karte für die Web-App; Antippen startet die Route. */
export function MiniMap({ location, onPress }: { location: LatLng; onPress: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const googleFailed = useGoogleMapsFailed();
  const position = { lat: location.latitude, lng: location.longitude };
  return (
    <View style={styles.frame}>
      {config.googleMapsKey && !googleFailed ? (
        <APIProvider apiKey={config.googleMapsKey} language="de" region="DE">
          <GoogleMap
            mapId={config.googleMapId}
            colorScheme={dark ? ColorScheme.DARK : ColorScheme.LIGHT}
            defaultCenter={position}
            defaultZoom={16}
            gestureHandling="none"
            disableDefaultUI
            clickableIcons={false}
            keyboardShortcuts={false}
            style={{ width: '100%', height: '100%' }}>
            <AdvancedMarker position={position}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: theme.accent,
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  boxSizing: 'border-box',
                }}
              />
            </AdvancedMarker>
          </GoogleMap>
        </APIProvider>
      ) : (
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={16}
          style={{ height: '100%', width: '100%', background: theme.backgroundElement }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}>
          <BaseMap dark={dark} />
          <CircleMarker
            center={[location.latitude, location.longitude]}
            radius={10}
            pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: theme.accent, fillOpacity: 1 }}
          />
        </MapContainer>
      )}
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
