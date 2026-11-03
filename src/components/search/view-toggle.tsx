import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ViewMode } from '@/store/search-store';

const OPTIONS: { mode: ViewMode; label: string; icon: IconName }[] = [
  { mode: 'list', label: 'Liste', icon: 'list' },
  { mode: 'map', label: 'Karte', icon: 'map' },
];

type Props = { value: ViewMode; onChange: (mode: ViewMode) => void };

export function ViewToggle({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}
      accessibilityRole="tablist">
      {OPTIONS.map((o) => {
        const selected = o.mode === value;
        const color = selected ? theme.text : theme.textSecondary;
        return (
          <Pressable
            key={o.mode}
            onPress={() => onChange(o.mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Als ${o.label} anzeigen`}
            style={[styles.option, selected && { backgroundColor: theme.background }]}>
            <Icon name={o.icon} size={14} color={color} />
            <ThemedText type="smallBold" style={{ color }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: Radius.small, padding: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    minHeight: 32,
    borderRadius: Radius.small - 2,
  },
});
