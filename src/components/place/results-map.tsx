import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';
import { radiusForRegion, regionDiffersFromSearch, regionForRadius } from '@/utils/map-region';

import { PlaceCard } from './place-card';

type Props = {
  places: PlaceSummary[];
  center: LatLng;
  radiusMeters: number;
  userLocation: LatLng | null;
  onSearchArea: (center: LatLng, radiusMeters: number) => void;
  /** Abstand der schwebenden Elemente vom oberen Rand (z. B. unter einer Kopfzeile). */
  topInset?: number;
};

export function ResultsMap({
  places,
  center,
  radiusMeters,
  userLocation,
  onSearchArea,
  topInset = Spacing.three,
}: Props) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Zuletzt sichtbarer Ausschnitt. Der Button erscheint nur, wenn er deutlich vom Suchkreis abweicht –
  // nach einer neuen Suche oder dem Schwenk zu einem Bezirk verschwindet er dadurch von selbst.
  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);
  const pendingRegion =
    visibleRegion && regionDiffersFromSearch(visibleRegion, center, radiusMeters)
      ? visibleRegion
      : null;
  const selected = places.find((p) => p.id === selectedId) ?? null;

  // Bei neuem Suchmittelpunkt (z. B. anderer Bezirk) dorthin schwenken.
  useEffect(() => {
    mapRef.current?.animateToRegion(regionForRadius(center, radiusMeters), 350);
  }, [center.latitude, center.longitude, radiusMeters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regionForRadius(center, radiusMeters)}
        showsUserLocation={userLocation !== null}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
        onRegionChangeComplete={setVisibleRegion}
        accessibilityLabel="Karte mit Suchergebnissen">
        {places.map((p) => (
          <Marker
            key={p.id}
            identifier={p.id}
            coordinate={p.location}
            title={p.name}
            pinColor={p.id === selectedId ? theme.text : theme.accent}
            tracksViewChanges={false}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(p.id);
            }}
          />
        ))}
      </MapView>

      {pendingRegion && (
        <View style={[styles.topOverlay, { top: topInset }]} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              onSearchArea(
                { latitude: pendingRegion.latitude, longitude: pendingRegion.longitude },
                radiusForRegion(pendingRegion),
              );
            }}
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

      {selected && (
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
  topOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  areaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bottomOverlay: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
  },
});
