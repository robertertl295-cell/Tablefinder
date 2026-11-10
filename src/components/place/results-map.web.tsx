import 'leaflet/dist/leaflet.css';

import { latLng, type LatLngBounds } from 'leaflet';
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { CircleMarker, MapContainer, useMap, useMapEvents } from 'react-leaflet';

import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng, PlaceSummary } from '@/types/place';
import { regionDiffersFromSearch, type MapRegion } from '@/utils/map-region';

import { config } from '@/services/config';

import { BaseMap } from './base-map.web';
import { useGoogleMapsFailed } from './google-maps-auth';
import { GoogleResultsMap } from './google-results-map.web';
import { MapOverlays, useMapSelection, type ResultsMapProps } from './map-overlays';

type Props = ResultsMapProps;

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

/** Schwenkt zum gewählten Ort (wenn die Auswahl von außen kommt, z. B. aus der Karten-Leiste). */
function FocusPlace({ place }: { place: PlaceSummary | null }) {
  const map = useMap();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (place)
      map.panTo([place.location.latitude, place.location.longitude], { animate: !reduceMotion });
  }, [map, place?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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

/**
 * Karte für die Web-App (react-native-maps läuft nicht im Browser):
 * mit Google-Key die Google-Karte, sonst Leaflet mit OpenFreeMap.
 */
export function ResultsMap(props: Props) {
  const googleFailed = useGoogleMapsFailed();
  return config.googleMapsKey && !googleFailed ? (
    <GoogleResultsMap {...props} />
  ) : (
    <LeafletResultsMap {...props} />
  );
}

function LeafletResultsMap({
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
    <View style={styles.container} accessibilityLabel="Karte mit Suchergebnissen">
      <MapContainer
        bounds={toBounds(center, radiusMeters)}
        style={{ height: '100%', width: '100%', background: theme.backgroundElement }}
        zoomControl={false}
        maxZoom={19}>
        <BaseMap dark={dark} />
        <FollowSearch center={center} radiusMeters={radiusMeters} />
        <TrackRegion onRegion={setVisibleRegion} onMapPress={clear} />
        {controlled && <FocusPlace place={selectedPlace} />}
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
