import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlaceSummary } from '@/types/place';
import { formatCount, formatRating } from '@/utils/format';
import { placeAccessibilityLabel } from '@/utils/place-labels';
import { useUnits } from '@/store/settings-store';
import { formatWalkingTime, spokenWalkingTime } from '@/utils/walking';

import { useCardImage } from './place-card';
import { PlacePhoto } from './place-photo';

export const MINI_CARD_WIDTH = 220;

/** Kleine Karte für horizontale Reihen (Entdecken, Karten-Leiste). */
export function MiniPlaceCard({
  place,
  distanceMeters,
  onPress,
  width = MINI_CARD_WIDTH,
  selected = false,
}: {
  place: PlaceSummary;
  distanceMeters: number | null;
  onPress: () => void;
  width?: number;
  selected?: boolean;
}) {
  const theme = useTheme();
  const units = useUnits();
  const { photo, placeholder } = useCardImage(place);
  const meta = [
    place.typeLabel,
    distanceMeters !== null ? `🚶 ${formatWalkingTime(distanceMeters)}` : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        placeAccessibilityLabel(place, distanceMeters, units) +
        (distanceMeters !== null ? `, ${spokenWalkingTime(distanceMeters)}` : '')
      }
      accessibilityHint="Öffnet die Details"
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: theme.background,
          borderColor: selected ? theme.accent : theme.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <PlacePhoto photo={photo} placeholder={placeholder} width={width} style={styles.photo} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
          {place.name}
        </ThemedText>
        {meta.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {meta.join(' · ')}
          </ThemedText>
        )}
        <ThemedText type="small" numberOfLines={1}>
          {place.rating !== null ? (
            <>
              <ThemedText type="small" style={{ color: theme.accent }}>
                ★{' '}
              </ThemedText>
              {formatRating(place.rating)}
              <ThemedText type="small" themeColor="textSecondary">
                {' '}
                ({formatCount(place.ratingCount)})
              </ThemedText>
            </>
          ) : place.openNow === true ? (
            <ThemedText type="small" style={{ color: theme.success }}>
              Jetzt geöffnet
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Keine Bewertung
            </ThemedText>
          )}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.medium, overflow: 'hidden' },
  photo: { height: 120 },
  body: { padding: Spacing.two, gap: 2 },
  name: { fontSize: 16, lineHeight: 21 },
});
