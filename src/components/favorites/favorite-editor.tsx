import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { favoritesStore, useFavorites } from '@/store/favorites-store';
import { MAX_NOTE_LENGTH } from '@/utils/favorites';

import { OwnRatingInput } from './own-rating-input';

/** Eigene Angaben zu einem Lokal: Listen, besucht, eigene Bewertung, Notiz (nur lokal). */
export function FavoriteEditor({ placeId }: { placeId: string }) {
  const theme = useTheme();
  const favorite = useFavorites((s) => s.favorites[placeId]);
  const lists = useFavorites((s) => s.lists);
  const store = favoritesStore.getState();

  if (!favorite) {
    return (
      <Pressable
        onPress={() => store.addFavorite(placeId)}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.addButton,
          { borderColor: theme.accent, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Icon name="heart" size={18} color={theme.accent} />
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          Zu Favoriten hinzufügen
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <ThemedText type="smallBold">Listen</ThemedText>
        <View style={styles.wrap}>
          {lists.map((l) => (
            <Chip
              key={l.id}
              label={l.name}
              selected={favorite.listIds.includes(l.id)}
              onPress={() => store.toggleList(placeId, l.id)}
            />
          ))}
          <Chip
            label="Listen verwalten"
            onPress={() => router.push('/favorites-manage')}
            icon={<Icon name="plus" size={14} color={theme.text} />}
          />
        </View>
      </View>

      <View style={styles.switchRow}>
        <ThemedText type="smallBold">Schon besucht</ThemedText>
        <Switch
          value={favorite.visited}
          onValueChange={(visited) => store.updateFavorite(placeId, { visited })}
          trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Schon besucht"
        />
      </View>

      <View style={styles.block}>
        <ThemedText type="smallBold">Eigene Bewertung</ThemedText>
        <OwnRatingInput
          value={favorite.ownRating}
          onChange={(ownRating) => store.updateFavorite(placeId, { ownRating })}
        />
      </View>

      <NoteInput placeId={placeId} initial={favorite.note} />
      <ThemedText type="small" themeColor="textSecondary">
        Diese Angaben bleiben nur auf deinem Gerät.
      </ThemedText>
    </View>
  );
}

/** Notiz mit verzögertem Speichern (nicht bei jedem Tastendruck in die Datenbank). */
function NoteInput({ placeId, initial }: { placeId: string; initial: string }) {
  const theme = useTheme();
  const [note, setNote] = useState(initial);
  const debounced = useDebouncedValue(note, 500);

  useEffect(() => {
    if (debounced !== favoritesStore.getState().favorites[placeId]?.note) {
      favoritesStore.getState().updateFavorite(placeId, { note: debounced });
    }
  }, [debounced, placeId]);

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">Notiz</ThemedText>
      <TextInput
        value={note}
        onChangeText={setNote}
        onEndEditing={() => favoritesStore.getState().updateFavorite(placeId, { note })}
        multiline
        maxLength={MAX_NOTE_LENGTH}
        placeholder="z. B. „Tisch am Fenster reservieren“"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Notiz"
        style={[styles.note, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  block: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: {
    minHeight: 96,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
  },
});
