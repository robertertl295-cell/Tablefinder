import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
  /** Element rechts vom Text, z. B. ein Entfernen-Kreuz. */
  trailing?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  trailing,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      {icon}
      <ThemedText type="smallBold" style={{ color: selected ? theme.onAccent : theme.text }}>
        {label}
      </ThemedText>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    borderRadius: Radius.pill,
  },
});
