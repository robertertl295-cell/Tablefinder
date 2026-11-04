import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';
import { radiusForRegion, type MapRegion } from '@/utils/map-region';

import { PlaceCard } from './place-card';

export type ResultsMapProps = {
  places: PlaceSummary[];
  center: LatLng;
  radiusMeters: number;
  userLocation: LatLng | null;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  topInset?: number;
};

/** Knopf „In diesem Bereich suchen“ und Vorschaukarte – gemeinsam für Leaflet- und Google-Karte. */
export function MapOverlays({
  pendingRegion,
  onSearchArea,
  topInset,
  selected,
  userLocation,
}: {
  pendingRegion: MapRegion | null;
  onSearchArea?: (center: LatLng, radiusMeters: number) => void;
  topInset: number;
  selected: PlaceSummary | null;
  userLocation: LatLng | null;
}) {
  const theme = useTheme();
  return (
    <>
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
    </>
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
