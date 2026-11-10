import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { MiniPlaceCard, MINI_CARD_WIDTH } from '@/components/place/mini-place-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { LatLng } from '@/types/place';
import type { DiscoverRow } from '@/utils/discover';
import { distanceMeters } from '@/utils/geo';

/** Horizontale Reihen zum Durchwischen („Top bewertet in deiner Nähe“, „Jetzt geöffnet“ …). */
export function DiscoverRows({
  rows,
  userLocation,
}: {
  rows: DiscoverRow[];
  userLocation: LatLng | null;
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.container} testID="discover-rows">
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
            {row.title}
          </ThemedText>
          <FlatList
            horizontal
            data={row.places}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            snapToInterval={MINI_CARD_WIDTH + Spacing.three}
            decelerationRate="fast"
            initialNumToRender={3}
            renderItem={({ item }) => (
              <MiniPlaceCard
                place={item}
                distanceMeters={userLocation ? distanceMeters(userLocation, item.location) : null}
                onPress={() => router.push({ pathname: '/place/[id]', params: { id: item.id } })}
              />
            )}
          />
        </View>
      ))}
      <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
        Alle Lokale
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four, paddingBottom: Spacing.three },
  row: { gap: Spacing.two },
  title: { fontSize: 20, lineHeight: 26 },
  list: { marginHorizontal: -Spacing.three },
  listContent: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});
