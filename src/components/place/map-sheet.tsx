import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { mayShowDetailsOnMap } from '@/services/places/map-rules';
import type { LatLng, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

import { PlaceCard } from './place-card';

const GAP = Spacing.two;
/** Wie weit man ziehen muss, damit die Leiste auf- bzw. zuklappt. */
const DRAG_THRESHOLD = 30;

type Props = {
  places: PlaceSummary[];
  userLocation: LatLng | null;
  selectedId: string | null;
  onSelect: (place: PlaceSummary | null) => void;
  /** Zeile über den Karten, z. B. „20 Treffer“. */
  summary: string;
  onEndReached?: () => void;
};

/**
 * Leiste unter der Karte (wie bei Google Maps oder Lieferdiensten):
 * - eingeklappt: wischbare Karten, verbunden mit den Punkten auf der Karte,
 * - hochgezogen: Liste aller Treffer, die die Karte ganz verdeckt.
 *
 * EWR-Bedingungen: Google-Inhalte dürfen nicht zusammen mit einer Karte erscheinen. Eingeklappt
 * zeigt die Leiste daher nur Lokale, die das dürfen (OpenStreetMap, Beispieldaten); Google-Lokale
 * stehen erst in der hochgezogenen Liste, wenn die Karte nicht mehr zu sehen ist.
 */
export function MapSheet({
  places,
  userLocation,
  selectedId,
  onSelect,
  summary,
  onEndReached,
}: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const strip = places.filter((p) => mayShowDetailsOnMap(p.source));
  const hiddenOnMap = places.length - strip.length;
  const cardWidth = Math.min(width - Spacing.three * 2 - Spacing.five, 420);
  const listRef = useRef<FlatList<PlaceSummary>>(null);

  const toggle = (next: boolean) => {
    if (next === expanded) return;
    if (!reduceMotion && Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded(next);
  };

  // Hochziehen/Runterziehen am Griff (Tippen schaltet ebenfalls um).
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dy < -DRAG_THRESHOLD) toggle(true);
      else if (g.dy > DRAG_THRESHOLD) toggle(false);
    },
  });

  // Punkt auf der Karte gewählt → passende Karte in die Mitte holen.
  const selectedIndex = strip.findIndex((p) => p.id === selectedId);
  useEffect(() => {
    if (selectedIndex >= 0 && !expanded) {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: !reduceMotion });
    }
  }, [selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (p: PlaceSummary) => router.push({ pathname: '/place/[id]', params: { id: p.id } });
  const distance = (p: PlaceSummary) =>
    userLocation ? distanceMeters(userLocation, p.location) : null;

  const handle = (
    <View {...pan.panHandlers}>
      <Pressable
        onPress={() => toggle(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Karte zeigen' : 'Liste aufklappen'}
        accessibilityHint={expanded ? 'Klappt die Liste ein' : 'Zeigt alle Treffer als Liste'}
        style={styles.handleArea}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.summary}>
            {summary}
          </ThemedText>
          <View style={styles.toggle}>
            <Icon name={expanded ? 'map' : 'list'} size={16} color={theme.accent} />
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {expanded ? 'Karte' : 'Liste'}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    </View>
  );

  if (expanded) {
    return (
      <View
        style={[StyleSheet.absoluteFill, styles.expanded, { backgroundColor: theme.background }]}>
        {handle}
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={4}
          renderItem={({ item }) => (
            <PlaceCard place={item} distanceMeters={distance(item)} onPress={() => open(item)} />
          )}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.collapsed, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {handle}
      {strip.length > 0 ? (
        <FlatList
          ref={listRef}
          horizontal
          data={strip}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          snapToInterval={cardWidth + GAP}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: cardWidth + GAP,
            offset: (cardWidth + GAP) * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP));
            const place = strip[Math.max(0, Math.min(i, strip.length - 1))];
            if (place && place.id !== selectedId) onSelect(place);
          }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.stripCard,
                {
                  width: cardWidth,
                  borderColor: item.id === selectedId ? theme.accent : 'transparent',
                },
              ]}>
              <PlaceCard
                compact
                place={item}
                distanceMeters={distance(item)}
                onPress={() => open(item)}
              />
            </View>
          )}
        />
      ) : null}
      {hiddenOnMap > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {strip.length > 0
            ? `${hiddenOnMap} Google-Lokale nur als Punkt – Details in der Liste oder per Tipp.`
            : 'Tippe auf einen Punkt für Details oder zieh die Liste hoch.'}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.two,
    boxShadow: '0 -2px 12px rgba(0,0,0,0.12)',
  },
  expanded: { zIndex: 2000 },
  handleArea: { paddingTop: Spacing.two, paddingHorizontal: Spacing.three, gap: Spacing.one },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
  },
  summary: { flex: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  stripContent: { gap: GAP, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  stripCard: { borderWidth: 2, borderRadius: Radius.medium + 2 },
  hint: { paddingHorizontal: Spacing.three, paddingTop: Spacing.one },
  listContent: { padding: Spacing.three, paddingBottom: Spacing.six },
});
