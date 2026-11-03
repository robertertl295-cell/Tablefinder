import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DataSource, Review } from '@/types/place';

const SOURCE_LABEL: Record<DataSource, string> = {
  google: 'Rezensionen von Google-Nutzern · neueste zuerst',
  mock: 'Beispielrezensionen (Mock-Daten)',
  osm: 'OpenStreetMap enthält keine Rezensionen.',
};

/** Die neuesten Rezensionen mit Autor und Quellenangabe. */
export function ReviewList({ reviews, source }: { reviews: Review[]; source: DataSource }) {
  if (reviews.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Noch keine Rezensionen vorhanden.
      </ThemedText>
    );
  }
  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        {SOURCE_LABEL[source]}
      </ThemedText>
      {reviews.map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [truncatable, setTruncatable] = useState(false);
  const meta = [review.relativeTime].filter(Boolean).join(' · ');

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <Pressable
          disabled={!review.authorUri}
          onPress={() => review.authorUri && void Linking.openURL(review.authorUri)}
          accessibilityRole={review.authorUri ? 'link' : 'text'}
          accessibilityLabel={`Rezension von ${review.authorName}`}>
          <ThemedText
            type="smallBold"
            style={review.authorUri ? { color: theme.accent } : undefined}>
            {review.authorName}
          </ThemedText>
        </Pressable>
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
      </View>
      {review.rating !== null && (
        <View style={styles.stars} accessible accessibilityLabel={`${review.rating} von 5 Sternen`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Icon
              key={n}
              name="star"
              size={12}
              color={review.rating! >= n ? theme.accent : theme.backgroundSelected}
            />
          ))}
        </View>
      )}
      {review.text ? (
        <>
          <ThemedText
            type="small"
            numberOfLines={expanded ? undefined : 5}
            onTextLayout={(e) => !expanded && setTruncatable(e.nativeEvent.lines.length >= 5)}>
            {review.text}
          </ThemedText>
          {(truncatable || expanded) && (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
              hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
              </ThemedText>
            </Pressable>
          )}
        </>
      ) : null}
    </View>
  );
}

export function ExternalLinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.linkRow} hitSlop={8}>
      <ThemedText type="smallBold" style={{ color: theme.accent }}>
        {label}
      </ThemedText>
      <Icon name="external" size={14} color={theme.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.four },
  item: { gap: Spacing.one },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, flexWrap: 'wrap' },
  stars: { flexDirection: 'row', gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
