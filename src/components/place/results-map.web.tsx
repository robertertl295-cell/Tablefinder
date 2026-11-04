import 'leaflet/dist/leaflet.css';

import { router } from 'expo-router';
import { latLng, type LatLngBounds } from 'leaflet';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { CircleMarker, MapContainer, useMap, useMapEvents } from 'react-leaflet';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';
import { radiusForRegion, regionDiffersFromSearch, type MapRegion } from '@/utils/map-region';

import { BaseMap } from './base-map.web';
import { mayShowDetailsOnMap } from '@/services/places/map-rules';

import { PlaceCard } from './place-card';

type Props = {
  places: PlaceSummary[];
  center: LatLng;
  radiusMeters: number;
  userLocation: LatLng | null;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  topInset?: number;
};

const toBounds = (center: LatLng, radiusMeters: number): LatLngBounds =>
  latLng(center.latitude, center.longitude).toBounds(radiusMeters * 2.3);

function regionOf(bounds: LatLngBounds): MapRegion {
  const c = bounds.getCenter();
  return {
    latitude: c.lat,
    longitude: c.lng,
    latitudeDelta: bounds.getNorth() - bounds.getSouth(),
    longitudeDelta: bounds.getEast() - bounds.getWest(),
  };
}

/** Schwenkt zur Suche, wenn sich Mittelpunkt oder Radius ändern. */
function FollowSearch({ center, radiusMeters }: { center: LatLng; radiusMeters: number }) {
  const map = useMap();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    map.fitBounds(toBounds(center, radiusMeters), { animate: !reduceMotion });
  }, [map, center.latitude, center.longitude, radiusMeters, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function TrackRegion({
  onRegion,
  onMapPress,
}: {
  onRegion: (r: MapRegion) => void;
  onMapPress: () => void;
}) {
  useMapEvents({
    moveend: (e) => onRegion(regionOf(e.target.getBounds())),
    click: onMapPress,
  });
  return null;
}

/** Karte für die Web-App: Leaflet mit OpenStreetMap-Kacheln (react-native-maps läuft nicht im Browser). */
export function ResultsMap({
  places,
  center,
  radiusMeters,
  userLocation,
  onSearchArea,
  topInset = Spacing.three,
}: Props) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<MapRegion | null>(null);
  const pendingRegion =
    visibleRegion && regionDiffersFromSearch(visibleRegion, center, radiusMeters)
      ? visibleRegion
      : null;
  const selected = places.find((p) => p.id === selectedId) ?? null;
  // Google-Orte: Name und Bewertung nicht auf der Karte zeigen (EWR-Bedingungen) –
  // ein Tipp auf den Punkt öffnet direkt die Detailseite.
  const select = (p: PlaceSummary) => {
    if (mayShowDetailsOnMap(p.source)) setSelectedId(p.id);
    else router.push({ pathname: '/place/[id]', params: { id: p.id } });
  };

  return (
    <View style={styles.container} accessibilityLabel="Karte mit Suchergebnissen">
      <MapContainer
        bounds={toBounds(center, radiusMeters)}
        style={{ height: '100%', width: '100%', background: theme.backgroundElement }}
        zoomControl={false}
        maxZoom={19}>
        <BaseMap dark={dark} />
        <FollowSearch center={center} radiusMeters={radiusMeters} />
        <TrackRegion onRegion={setVisibleRegion} onMapPress={() => setSelectedId(null)} />
        {userLocation && (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={7}
            pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }}
          />
        )}
        {places.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.location.latitude, p.location.longitude]}
            radius={p.id === selectedId ? 11 : 8}
            // Klick nicht an die Karte weiterreichen – deren Klick hebt die Auswahl auf.
            bubblingMouseEvents={false}
            pathOptions={{
              color: '#FFFFFF',
              weight: 2,
              fillColor: p.id === selectedId ? theme.text : theme.accent,
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => select(p) }}
          />
        ))}
      </MapContainer>

      {pendingRegion && onSearchArea && (
        <View style={[styles.topOverlay, { top: topInset }]} pointerEvents="box-none">
          <Pressable
            onPress={() =>
              onSearchArea(
                { latitude: pendingRegion.latitude, longitude: pendingRegion.longitude },
                radiusForRegion(pendingRegion),
              )
            }
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.areaButton,
              { backgroundColor: theme.background, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Icon name="refresh" size={14} color={theme.accent} />
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              In diesem Bereich suchen
            </ThemedText>
          </Pressable>
        </View>
      )}

      {selected && mayShowDetailsOnMap(selected.source) && (
        <View style={styles.bottomOverlay}>
          <PlaceCard
            compact
            place={selected}
            distanceMeters={userLocation ? distanceMeters(userLocation, selected.location) : null}
            onPress={() => router.push({ pathname: '/place/[id]', params: { id: selected.id } })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  areaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    borderRadius: Radius.pill,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  bottomOverlay: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.five,
    zIndex: 1000,
  },
});
