/// <reference types="google.maps" />
import {
  AdvancedMarker,
  APIProvider,
  ColorScheme,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { config } from '@/services/config';
import type { LatLng, PlaceSummary } from '@/types/place';
import { regionDiffersFromSearch, type MapRegion } from '@/utils/map-region';

import { MapOverlays, useMapSelection, type ResultsMapProps as Props } from './map-overlays';

/** Kartenausschnitt, der den Suchkreis mit etwas Rand zeigt. */
export function boundsFor(center: LatLng, radiusMeters: number): google.maps.LatLngBoundsLiteral {
  const dLat = (radiusMeters * 1.15) / 111_320;
  const dLng = dLat / Math.cos((center.latitude * Math.PI) / 180);
  return {
    north: center.latitude + dLat,
    south: center.latitude - dLat,
    east: center.longitude + dLng,
    west: center.longitude - dLng,
  };
}

function regionOf(bounds: google.maps.LatLngBounds): MapRegion {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    latitude: (ne.lat() + sw.lat()) / 2,
    longitude: (ne.lng() + sw.lng()) / 2,
    latitudeDelta: ne.lat() - sw.lat(),
    longitudeDelta: ne.lng() - sw.lng(),
  };
}

/** Schwenkt zur Suche, wenn sich Mittelpunkt oder Radius ändern. */
function FollowSearch({ center, radiusMeters }: { center: LatLng; radiusMeters: number }) {
  const map = useMap();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!map) return;
    const bounds = boundsFor(center, radiusMeters);
    // Google animiert nur kurze Wege; mit reduzierter Bewegung springt die Karte direkt.
    if (reduceMotion) map.fitBounds(bounds, 0);
    else map.panToBounds(bounds, 0);
    map.fitBounds(bounds, 0);
  }, [map, center.latitude, center.longitude, radiusMeters, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Schwenkt zum gewählten Ort (Auswahl aus der Karten-Leiste). */
function FocusPlace({ place }: { place: PlaceSummary | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && place) map.panTo({ lat: place.location.latitude, lng: place.location.longitude });
  }, [map, place?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Punkt auf der Karte (eigenes Element statt Google-Pin: passt zum App-Design). */
function Dot({ color, size, ring = '#FFFFFF' }: { color: string; size: number; ring?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color,
        border: `2px solid ${ring}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
    />
  );
}

/**
 * Ergebniskarte mit Google Maps (Maps JavaScript API).
 * EWR-Bedingungen: Google-Orte erscheinen nur als Punkte; ein Tipp öffnet die Detailseite.
 * Die eigenen Google-POIs der Karte sind nicht anklickbar (sonst öffnet Google eigene Infofenster).
 */
export function GoogleResultsMap({
  places,
  center,
  radiusMeters,
  userLocation,
  onSearchArea,
  topInset = Spacing.three,
  selectedId: selectedIdProp,
  onSelectPlace,
}: Props) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const [visibleRegion, setVisibleRegion] = useState<MapRegion | null>(null);
  const pendingRegion =
    visibleRegion && regionDiffersFromSearch(visibleRegion, center, radiusMeters)
      ? visibleRegion
      : null;
  const { selectedId, controlled, card, select, clear } = useMapSelection(
    places,
    selectedIdProp,
    onSelectPlace,
  );
  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}
      accessibilityLabel="Karte mit Suchergebnissen">
      <APIProvider apiKey={config.googleMapsKey ?? ''} language="de" region="DE">
        <GoogleMap
          mapId={config.googleMapId}
          colorScheme={dark ? ColorScheme.DARK : ColorScheme.LIGHT}
          defaultBounds={boundsFor(center, radiusMeters)}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
          onClick={clear}
          onIdle={(e) => {
            const bounds = e.map.getBounds();
            if (bounds) setVisibleRegion(regionOf(bounds));
          }}>
          <FollowSearch center={center} radiusMeters={radiusMeters} />
          {controlled && <FocusPlace place={selectedPlace} />}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
              zIndex={1}>
              <Dot color="#2563EB" size={16} />
            </AdvancedMarker>
          )}
          {places.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.location.latitude, lng: p.location.longitude }}
              zIndex={p.id === selectedId ? 3 : 2}
              onClick={() => select(p)}>
              <Dot
                color={p.id === selectedId ? theme.text : theme.accent}
                size={p.id === selectedId ? 22 : 16}
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      <MapOverlays
        pendingRegion={pendingRegion}
        onSearchArea={onSearchArea}
        topInset={topInset}
        selected={card}
        userLocation={userLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
