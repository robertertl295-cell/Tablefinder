import { Alert, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { favoritesStore, useIsFavorite } from '@/store/favorites-store';

type Props = {
  placeId: string;
  placeName: string;
  /** Rund mit Hintergrund (über Fotos) oder schlicht. */
  variant?: 'overlay' | 'plain';
  size?: number;
};

/** Herz zum Merken. Beim Entfernen mit eigenen Angaben wird nachgefragt. */
export function FavoriteButton({ placeId, placeName, variant = 'overlay', size = 20 }: Props) {
  const theme = useTheme();
  const isFavorite = useIsFavorite(placeId);

  const toggle = () => {
    const store = favoritesStore.getState();
    const fav = store.favorites[placeId];
    if (!fav) {
      store.addFavorite(placeId);
      return;
    }
    const hasOwnData =
      fav.note.trim() || fav.ownRating !== null || fav.visited || fav.listIds.length;
    if (!hasOwnData) {
      store.removeFavorite(placeId);
      return;
    }
    Alert.alert(
      'Aus Favoriten entfernen?',
      `Deine Notiz, Bewertung und Listen zu „${placeName}“ werden gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Entfernen', style: 'destructive', onPress: () => store.removeFavorite(placeId) },
      ],
    );
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      accessibilityLabel={
        isFavorite ? `${placeName} aus Favoriten entfernen` : `${placeName} zu Favoriten hinzufügen`
      }
      hitSlop={8}
      style={({ pressed }) => [
        variant === 'overlay' && [styles.overlay, { backgroundColor: theme.background }],
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon
        name={isFavorite ? 'heartFill' : 'heart'}
        size={size}
        color={isFavorite ? theme.accent : theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
