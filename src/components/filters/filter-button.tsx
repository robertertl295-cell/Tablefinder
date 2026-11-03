import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { activeCount: number; onPress: () => void };

export function FilterButton({ activeCount, onPress }: Props) {
  const theme = useTheme();
  const active = activeCount > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? `Filter, ${activeCount} aktiv` : 'Filter'}
      accessibilityHint="Öffnet die Filter"
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon name="filter" size={14} color={active ? theme.accent : theme.text} />
      <ThemedText type="smallBold" style={{ color: active ? theme.accent : theme.text }}>
        Filter
      </ThemedText>
      {active && (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <ThemedText style={[styles.badgeText, { color: theme.onAccent }]}>
            {activeCount}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    minHeight: 36,
    borderRadius: Radius.small,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: 700 },
});
