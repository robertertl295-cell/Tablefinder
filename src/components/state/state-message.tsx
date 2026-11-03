import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Gemeinsame Darstellung für Leer- und Fehlerzustände. */
export function StateMessage({ icon, title, message, actionLabel, onAction }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container} accessibilityRole="summary">
      <Icon name={icon} size={36} color={theme.textSecondary} />
      <ThemedText type="subtitle" style={styles.center}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  center: { textAlign: 'center' },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
});
