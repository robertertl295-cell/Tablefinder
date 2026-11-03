import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCount, formatRating } from '@/utils/format';
import { RATING_CONFIDENCE_LABEL, ratingConfidence } from '@/utils/rating';

type Props = { rating: number | null; ratingCount: number };

/** Sterne + Anzahl, immer zusammen; bei unter 30 Bewertungen ein deutlicher Hinweis. */
export function RatingLine({ rating, ratingCount }: Props) {
  const theme = useTheme();
  const confidence = ratingConfidence(ratingCount);

  if (rating === null || confidence === 'none') {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {RATING_CONFIDENCE_LABEL.none}
      </ThemedText>
    );
  }

  return (
    <View style={styles.row}>
      <Icon name="star" size={14} color={theme.accent} />
      <ThemedText type="smallBold">{formatRating(rating)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        ({formatCount(ratingCount)})
      </ThemedText>
      {confidence === 'low' && (
        <View style={[styles.badge, { borderColor: theme.warning }]}>
          <ThemedText type="small" style={[styles.badgeText, { color: theme.warning }]}>
            {RATING_CONFIDENCE_LABEL.low}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexWrap: 'wrap' },
  badge: {
    marginLeft: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
  },
  badgeText: { fontSize: 12, lineHeight: 18, fontWeight: 600 },
});
