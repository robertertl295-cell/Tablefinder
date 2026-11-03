import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlaceCard } from '@/components/place/place-card';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FavoritePlaceEntry } from '@/hooks/use-favorite-places';
import { PLACES_ERROR_MESSAGE } from '@/services/places/errors';
import { favoritesStore } from '@/store/favorites-store';
import type { Favorite, FavoriteList } from '@/types/favorites';
import type { LatLng } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

type Props = {
  favorite: Favorite;
  entry: FavoritePlaceEntry;
  lists: FavoriteList[];
  userLocation: LatLng | null;
};

/** Favorit: aktuelle Ortsdaten plus eigene Angaben (besucht, Bewertung, Notiz, Listen). */
export function FavoriteCard({ favorite, entry, lists, userLocation }: Props) {
  const theme = useTheme();
  const listNames = favorite.listIds
    .map((id) => lists.find((l) => l.id === id)?.name)
    .filter(Boolean);

  const own = (
    <View style={styles.own}>
      <View style={styles.ownRow}>
        {favorite.visited ? (
          <ThemedText type="smallBold" style={{ color: theme.success }}>
            ✓ Besucht
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Noch nicht besucht
          </ThemedText>
        )}
        {favorite.ownRating !== null && (
          <View
            style={styles.ownRating}
            accessible
            accessibilityLabel={`Eigene Bewertung ${favorite.ownRating} von 5`}>
            <ThemedText type="small" themeColor="textSecondary">
              Ich:
            </ThemedText>
            {Array.from({ length: favorite.ownRating }, (_, i) => (
              <Icon key={i} name="star" size={12} color={theme.accent} />
            ))}
          </View>
        )}
      </View>
      {listNames.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {listNames.join(' · ')}
        </ThemedText>
      )}
      {favorite.note.trim() ? (
        <ThemedText type="small" numberOfLines={2} style={styles.note}>
          „{favorite.note.trim()}“
        </ThemedText>
      ) : null}
    </View>
  );

  if (entry.status === 'loaded') {
    const place = entry.place;
    const closed = place.businessStatus === 'closed_permanently';
    return (
      <View
        style={[
          styles.container,
          { borderColor: closed ? theme.danger : theme.border, backgroundColor: theme.background },
        ]}>
        {closed && (
          <View style={[styles.closedBanner, { backgroundColor: theme.danger }]}>
            <ThemedText type="smallBold" style={styles.closedText}>
              Dauerhaft geschlossen
            </ThemedText>
          </View>
        )}
        <PlaceCard
          compact
          flat
          place={place}
          distanceMeters={userLocation ? distanceMeters(userLocation, place.location) : null}
          onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
        />
        {own}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, styles.padded, { borderColor: theme.border }]}
      accessibilityLiveRegion="polite">
      {entry.status === 'loading' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Wird geladen …
        </ThemedText>
      ) : entry.error.kind === 'not_found' ? (
        <View style={styles.missing}>
          <ThemedText type="smallBold">Ort nicht mehr verfügbar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Google kennt diesen Eintrag nicht mehr (z. B. geschlossen oder zusammengelegt).
          </ThemedText>
          <Pressable
            onPress={() => favoritesStore.getState().removeFavorite(favorite.placeId)}
            accessibilityRole="button"
            hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              Aus Favoriten entfernen
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {PLACES_ERROR_MESSAGE[entry.error.kind]}
        </ThemedText>
      )}
      {own}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: { padding: Spacing.three, gap: Spacing.two },
  own: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.one },
  ownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  ownRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  note: { fontStyle: 'italic' },
  closedBanner: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  closedText: { color: '#FFFFFF' },
  missing: { gap: Spacing.one },
});
