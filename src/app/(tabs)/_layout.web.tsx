import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useAutoSearch } from '@/hooks/use-auto-search';
import { useTheme } from '@/hooks/use-theme';

/**
 * Web-Version (Web-App auf dem Home-Bildschirm): Tab-Leiste unten wie in einer iOS-App,
 * mit Abstand zum Home-Indikator. Die native Version nutzt NativeTabs (_layout.tsx).
 */
export default function TabsLayout() {
  useAutoSearch();
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="search" label="Suche" />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon="map" label="Karte" />
          </TabTrigger>
          <TabTrigger name="favorites" href="/favorites" asChild>
            <TabButton icon="heart" activeIcon="heartFill" label="Favoriten" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings" label="Einstellungen" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

function BottomBar({ children, style, ...props }: ViewProps & { children?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: IconName;
  activeIcon?: IconName;
  label: string;
};

function TabButton({ icon, activeIcon, label, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;
  return (
    <Pressable
      {...(props as PressableProps)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.tab}>
      <Icon name={isFocused && activeIcon ? activeIcon : icon} size={24} color={color} />
      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one + Spacing.half,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
});
