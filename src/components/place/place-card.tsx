import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlaceSummary } from '@/types/place';
import { formatDistance, formatPriceLevel } from '@/utils/format';
import { placeAccessibilityLabel, placeStatus, type StatusTone } from '@/utils/place-labels';

import { PlacePhoto } from './place-photo';
import { RatingLine } from './rating-line';

type Props = {
  place: PlaceSummary;
  distanceMeters: number | null;
  onPress: () => void;
  /** Kompakte Variante (Foto links) für die Kartenansicht. */
  compact?: boolean;
};

export function PlaceCard({ place, distanceMeters, onPress, compact = false }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const status = placeStatus(place.openNow, place.businessStatus);
  const toneColor: Record<StatusTone, string> = {
    success: theme.success,
    neutral: theme.textSecondary,
    warning: theme.warning,
    danger: theme.danger,
  };
  const meta = [
    place.typeLabel,
    place.priceLevel !== null ? formatPriceLevel(place.priceLevel) : null,
    distanceMeters !== null ? formatDistance(distanceMeters) : null,
  ].filter(Boolean);
  const isClosed = place.businessStatus === 'closed_permanently';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={placeAccessibilityLabel(place, distanceMeters)}
      accessibilityHint="Öffnet die Details"
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <PlacePhoto
        photo={place.photo}
        width={compact ? 96 : width}
        style={[compact ? styles.photoCompact : styles.photo, isClosed && styles.dimmed]}
      />
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <ThemedText type="subtitle" numberOfLines={1} style={compact && styles.nameCompact}>
          {place.name}
        </ThemedText>
        {meta.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {meta.join(' · ')}
          </ThemedText>
        )}
        <RatingLine rating={place.rating} ratingCount={place.ratingCount} />
        {status && (
          <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
            {status.label}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compact: { flexDirection: 'row', borderRadius: Radius.medium },
  photo: { height: 168 },
  photoCompact: { width: 96, alignSelf: 'stretch', minHeight: 104 },
  dimmed: { opacity: 0.4 },
  body: { padding: Spacing.three, gap: Spacing.one },
  bodyCompact: { flex: 1, padding: Spacing.two + Spacing.one },
  nameCompact: { fontSize: 17, lineHeight: 22 },
});
