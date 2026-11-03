import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  description: string;
};

/** Vorläufiger Screen-Inhalt, bis die jeweilige Phase umgesetzt ist. */
export function ScreenPlaceholder({ title, description }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ThemedText type="title" accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{description}</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
});
