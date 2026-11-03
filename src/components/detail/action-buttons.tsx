import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Action = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  accessibilityHint?: string;
  primary?: boolean;
};

/** Große, gut treffbare Aktionen (Route, Anrufen, Website …). */
export function ActionButtons({ actions }: { actions: Action[] }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {actions.map((a) => {
        const fg = a.primary ? theme.onAccent : theme.accent;
        return (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityHint={a.accessibilityHint}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: a.primary ? theme.accent : theme.backgroundElement,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Icon name={a.icon} size={20} color={fg} />
            <ThemedText type="smallBold" style={{ color: fg }}>
              {a.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 64,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
  },
});
