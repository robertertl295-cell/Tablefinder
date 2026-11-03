import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Platzhalter in Kartenform während des ersten Ladens. */
export function PlaceCardSkeleton() {
  const theme = useTheme();
  const block = { backgroundColor: theme.backgroundElement };
  return (
    <View
      style={[styles.card, { borderColor: theme.border }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.photo, block]} />
      <View style={styles.body}>
        <View style={[styles.line, styles.title, block]} />
        <View style={[styles.line, styles.short, block]} />
        <View style={[styles.line, styles.shorter, block]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  photo: { height: 168 },
  body: { padding: Spacing.three, gap: Spacing.two },
  line: { height: 14, borderRadius: 4 },
  title: { height: 22, width: '60%' },
  short: { width: '45%' },
  shorter: { width: '30%' },
});
