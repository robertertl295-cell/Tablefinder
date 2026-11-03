import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCount, formatRating } from '@/utils/format';
import {
  BROAD_DATA_THRESHOLD,
  LOW_DATA_THRESHOLD,
  RATING_CONFIDENCE_LABEL,
  ratingConfidence,
  type RatingConfidence,
} from '@/utils/rating';

const LEVELS: Exclude<RatingConfidence, 'none'>[] = ['low', 'medium', 'high'];
const LEVEL_RANGE: Record<Exclude<RatingConfidence, 'none'>, string> = {
  low: `unter ${LOW_DATA_THRESHOLD}`,
  medium: `${LOW_DATA_THRESHOLD}–${BROAD_DATA_THRESHOLD - 1}`,
  high: `ab ${BROAD_DATA_THRESHOLD}`,
};

const EXPLANATION: Record<RatingConfidence, string> = {
  none: 'Für dieses Lokal liegen noch keine Bewertungen vor.',
  low: 'Wenige Bewertungen: Einzelne Stimmen können den Schnitt stark verschieben.',
  medium: 'Genug Bewertungen für einen verlässlichen ersten Eindruck.',
  high: 'Viele Bewertungen: Der Schnitt ist gut abgesichert.',
};

/**
 * Bewertung transparent: Schnitt, Anzahl und wie belastbar die Datenbasis ist.
 * (Eine Verteilung nach Sternen liefert die Places API nicht.)
 */
export function RatingSummary({
  rating,
  ratingCount,
}: {
  rating: number | null;
  ratingCount: number;
}) {
  const theme = useTheme();
  const confidence = ratingConfidence(ratingCount);
  const levelColor = confidence === 'low' ? theme.warning : theme.accent;

  return (
    <View style={styles.container}>
      {rating !== null && confidence !== 'none' && (
        <View
          style={styles.scoreRow}
          accessible
          accessibilityLabel={`${formatRating(rating)} von 5 Sternen aus ${formatCount(ratingCount)} Bewertungen`}>
          <ThemedText style={styles.score}>{formatRating(rating)}</ThemedText>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Icon
                key={n}
                name="star"
                size={18}
                color={rating >= n - 0.25 ? theme.accent : theme.backgroundSelected}
              />
            ))}
          </View>
          <ThemedText themeColor="textSecondary">{formatCount(ratingCount)} Bewertungen</ThemedText>
        </View>
      )}

      <View
        accessible
        accessibilityLabel={`Datenbasis: ${RATING_CONFIDENCE_LABEL[confidence]}. ${EXPLANATION[confidence]}`}
        style={styles.meterBlock}>
        <View style={styles.meter}>
          {LEVELS.map((level, i) => {
            const reached = confidence !== 'none' && LEVELS.indexOf(confidence) >= i;
            return (
              <View key={level} style={styles.segment}>
                <View
                  style={[
                    styles.bar,
                    { backgroundColor: reached ? levelColor : theme.backgroundSelected },
                  ]}
                />
                <ThemedText
                  type="small"
                  themeColor={confidence === level ? 'text' : 'textSecondary'}
                  style={[styles.segmentLabel, confidence === level && styles.current]}>
                  {LEVEL_RANGE[level]}
                </ThemedText>
              </View>
            );
          })}
        </View>
        <ThemedText type="smallBold" style={confidence === 'low' && { color: theme.warning }}>
          {RATING_CONFIDENCE_LABEL[confidence]}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {EXPLANATION[confidence]}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  score: { fontSize: 40, lineHeight: 46, fontWeight: 700 },
  stars: { flexDirection: 'row', gap: 2 },
  meterBlock: { gap: Spacing.one },
  meter: { flexDirection: 'row', gap: Spacing.one, marginBottom: Spacing.one },
  segment: { flex: 1, gap: Spacing.one },
  bar: { height: 8, borderRadius: Radius.pill },
  segmentLabel: { fontSize: 12, lineHeight: 16 },
  current: { fontWeight: 700 },
});
