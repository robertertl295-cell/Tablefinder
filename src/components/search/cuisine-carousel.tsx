import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupImageUri, type PlaceholderGroup } from '@/services/placeholders/placeholders';
import type { CuisineKey, Filters } from '@/types/filters';
import type { PlaceCategory } from '@/types/place';
import { toggle } from '@/utils/filters';

type Tile = {
  id: string;
  label: string;
  emoji: string;
  group: PlaceholderGroup;
} & ({ cuisine: CuisineKey } | { category: PlaceCategory });

/** Reihenfolge nach Beliebtheit in Berlin; Art (Café, Bar, Bäckerei) am Ende. */
export const CAROUSEL_TILES: readonly Tile[] = [
  { id: 'pizza', label: 'Pizza', emoji: '🍕', group: 'pizza', cuisine: 'pizza' },
  { id: 'italian', label: 'Italienisch', emoji: '🍝', group: 'italian', cuisine: 'italian' },
  { id: 'burger', label: 'Burger', emoji: '🍔', group: 'burger', cuisine: 'burger' },
  { id: 'turkish', label: 'Döner', emoji: '🥙', group: 'turkish', cuisine: 'turkish' },
  { id: 'japanese', label: 'Sushi', emoji: '🍣', group: 'japanese', cuisine: 'japanese' },
  { id: 'asian', label: 'Asiatisch', emoji: '🥢', group: 'asian', cuisine: 'asian' },
  { id: 'vietnamese', label: 'Vietnam.', emoji: '🍜', group: 'vietnamese', cuisine: 'vietnamese' },
  { id: 'indian', label: 'Indisch', emoji: '🍛', group: 'indian', cuisine: 'indian' },
  {
    id: 'middleEastern',
    label: 'Orient.',
    emoji: '🧆',
    group: 'middle_eastern',
    cuisine: 'middleEastern',
  },
  { id: 'mexican', label: 'Mexikan.', emoji: '🌮', group: 'mexican', cuisine: 'mexican' },
  { id: 'greek', label: 'Griechisch', emoji: '🫒', group: 'greek', cuisine: 'greek' },
  { id: 'german', label: 'Deutsch', emoji: '🥨', group: 'german', cuisine: 'german' },
  { id: 'cafe', label: 'Café', emoji: '☕', group: 'cafe', category: 'cafe' },
  { id: 'bar', label: 'Bar', emoji: '🍸', group: 'bar', category: 'bar' },
  { id: 'bakery', label: 'Bäckerei', emoji: '🥐', group: 'bakery', category: 'bakery' },
];

export function isTileSelected(tile: Tile, filters: Filters): boolean {
  return 'cuisine' in tile
    ? filters.cuisines.includes(tile.cuisine)
    : filters.categories.includes(tile.category);
}

export function toggleTile(tile: Tile, filters: Filters): Filters {
  return 'cuisine' in tile
    ? { ...filters, cuisines: toggle(filters.cuisines, tile.cuisine) }
    : { ...filters, categories: toggle(filters.categories, tile.category) };
}

const SIZE = 64;

/** Runde Bildkacheln wie bei Lieferdiensten: ein Tipp filtert nach Küche bzw. Art. */
export function CuisineCarousel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityLabel="Küchen">
      {CAROUSEL_TILES.map((tile) => {
        const selected = isTileSelected(tile, filters);
        const uri = groupImageUri(tile.group);
        return (
          <Pressable
            key={tile.id}
            onPress={() => onChange(toggleTile(tile, filters))}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tile.label}${selected ? ', ausgewählt' : ''}`}
            style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}>
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: selected ? theme.accent : 'transparent',
                },
              ]}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
              ) : (
                <ThemedText style={styles.emoji}>{tile.emoji}</ThemedText>
              )}
            </View>
            <ThemedText
              type="small"
              numberOfLines={1}
              style={[styles.label, selected && { color: theme.accent, fontWeight: 700 }]}>
              {tile.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginHorizontal: -Spacing.three },
  row: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  tile: { width: SIZE + 8, alignItems: 'center', gap: Spacing.one },
  circle: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  emoji: { fontSize: 30, lineHeight: 36 },
  label: { fontSize: 12, lineHeight: 16 },
});
