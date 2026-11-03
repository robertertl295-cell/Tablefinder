import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FavoriteButton } from '@/components/favorites/favorite-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUnits } from '@/store/settings-store';
import type { PlaceSummary } from '@/types/place';
import { formatDistance, formatPriceLevel, formatRating } from '@/utils/format';
import { placeAccessibilityLabel, placeStatus, type StatusTone } from '@/utils/place-labels';
import { trustScore } from '@/utils/trust-score';

import { PlacePhoto } from './place-photo';
import { RatingLine } from './rating-line';

type Props = {
  place: PlaceSummary;
  distanceMeters: number | null;
  onPress: () => void;
  /** Kompakte Variante (Foto links) für die Kartenansicht. */
  compact?: boolean;
  /** Ohne Rahmen (wenn die Karte in einem anderen Rahmen steckt). */
  flat?: boolean;
  /** Herz zum Merken anzeigen (Standard: ja). */
  showFavorite?: boolean;
  /** Vertrauensscore anzeigen (wenn danach sortiert wird). */
  showTrustScore?: boolean;
};

export function PlaceCard({
  place,
  distanceMeters,
  onPress,
  compact = false,
  flat = false,
  showFavorite = true,
  showTrustScore = false,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const units = useUnits();
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
    distanceMeters !== null ? formatDistance(distanceMeters, units) : null,
  ].filter(Boolean);
  const isClosed = place.businessStatus === 'closed_permanently';
  const score = showTrustScore ? trustScore(place.rating, place.ratingCount) : null;

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          placeAccessibilityLabel(place, distanceMeters, units) +
          (score !== null ? `, Vertrauensscore ${formatRating(score)}` : '')
        }
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
        {/* OSM hat keine Fotos – dann keine leere Fläche zeigen. */}
        {(place.photo || place.source !== 'osm') && (
          <PlacePhoto
            photo={place.photo}
            width={compact ? 96 : width}
            style={[compact ? styles.photoCompact : styles.photo, isClosed && styles.dimmed]}
          />
        )}
        <View style={[styles.body, compact && styles.bodyCompact]}>
          <ThemedText type="subtitle" numberOfLines={1} style={compact && styles.nameCompact}>
            {place.name}
          </ThemedText>
          {meta.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {meta.join(' · ')}
            </ThemedText>
          )}
          <RatingLine rating={place.rating} ratingCount={place.ratingCount} source={place.source} />
          {score !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              Vertrauensscore{' '}
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {formatRating(score)}
              </ThemedText>
            </ThemedText>
          )}
          {status && (
            <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
              {status.label}
            </ThemedText>
          )}
        </View>
      </Pressable>
      {showFavorite && (
        <View style={compact ? styles.heartCompact : styles.heart}>
          <FavoriteButton
            placeId={place.id}
            placeName={place.name}
            variant={compact ? 'plain' : 'overlay'}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compact: { flexDirection: 'row', borderRadius: Radius.medium },
  flat: { borderWidth: 0, borderRadius: 0 },
  heart: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  heartCompact: { position: 'absolute', top: Spacing.two + Spacing.one, right: Spacing.three },
  photo: { height: 168 },
  photoCompact: { width: 96, alignSelf: 'stretch', minHeight: 104 },
  dimmed: { opacity: 0.4 },
  body: { padding: Spacing.three, gap: Spacing.one },
  // Platz rechts für das Herz.
  bodyCompact: { flex: 1, padding: Spacing.two + Spacing.one, paddingRight: Spacing.six },
  nameCompact: { fontSize: 17, lineHeight: 22 },
});
