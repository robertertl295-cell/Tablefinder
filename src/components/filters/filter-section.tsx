import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';

export function FilterSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section} accessibilityRole="none">
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

type Option<T> = { value: T; label: string; accessibilityLabel?: string };

/** Einfachauswahl als Chips, inkl. „Alle“ (= null). */
export function SingleChoice<T extends number>({
  options,
  value,
  onChange,
  allLabel = 'Alle',
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  allLabel?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Chip label={allLabel} selected={value === null} onPress={() => onChange(null)} />
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          accessibilityLabel={o.accessibilityLabel}
          selected={value === o.value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

/** Mehrfachauswahl als Chips. */
export function MultiChoice<T extends string | number>({
  options,
  values,
  onToggle,
}: {
  options: Option<T>[];
  values: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip
          key={String(o.value)}
          label={o.label}
          accessibilityLabel={o.accessibilityLabel}
          selected={values.includes(o.value)}
          onPress={() => onToggle(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
