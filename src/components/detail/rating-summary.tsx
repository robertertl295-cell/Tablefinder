import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCount, formatRating } from '@/utils/format';
import {
  TRUST_PRIOR_MEAN,
  TRUST_PRIOR_WEIGHT,
  trustExplanation,
  trustScore,
} from '@/utils/trust-score';
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
  const score = trustScore(rating, ratingCount);
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

      {rating !== null && score !== null && (
        <View
          style={[styles.trust, { backgroundColor: theme.backgroundElement }]}
          accessible
          accessibilityLabel={`Vertrauensscore ${formatRating(score)} von 5. ${trustExplanation(rating, ratingCount, score)}`}>
          <View style={styles.trustRow}>
            <ThemedText type="smallBold">Vertrauensscore</ThemedText>
            <ThemedText style={[styles.trustValue, { color: theme.accent }]}>
              {formatRating(score)}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {trustExplanation(rating, ratingCount, score)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.trustMethod}>
            Berechnung: Der Google-Schnitt wird um {TRUST_PRIOR_WEIGHT} gedachte Bewertungen mit dem
            Berliner Durchschnitt ({formatRating(TRUST_PRIOR_MEAN)} ★) ergänzt. Bei vielen
            Bewertungen ändert das kaum etwas, bei wenigen viel.
          </ThemedText>
        </View>
      )}
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
  trust: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.medium },
  trustRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  trustValue: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  trustMethod: { fontSize: 12, lineHeight: 17, marginTop: Spacing.one },
});
