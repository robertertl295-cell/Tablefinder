import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Filters } from '@/types/filters';
import type { FilterChip } from '@/utils/filters';

type Props = {
  chips: FilterChip[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  /** Steht immer am Anfang der Zeile (z. B. der Filter-Button). */
  leading?: ReactNode;
  /** Ein-Tipp-Filter, die noch nicht aktiv sind („Jetzt offen“, „Terrasse“ …). */
  suggestions?: { id: string; label: string; onPress: () => void }[];
};

/** Filterleiste: optionaler Button vorne, dann aktive Filter als Chips (Antippen entfernt). */
export function ActiveFilterChips({
  chips,
  filters,
  onChange,
  onReset,
  leading,
  suggestions = [],
}: Props) {
  const theme = useTheme();
  if (chips.length === 0 && !leading) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      accessibilityLabel="Filterleiste">
      {leading}
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          selected
          onPress={() => onChange(chip.remove(filters))}
          accessibilityLabel={`Filter ${chip.label} entfernen`}
          trailing={<Icon name="close" size={14} color={theme.onAccent} />}
        />
      ))}
      {suggestions.map((s) => (
        <Chip
          key={s.id}
          label={s.label}
          onPress={s.onPress}
          accessibilityLabel={`Filter ${s.label} setzen`}
        />
      ))}
      {chips.length > 1 && (
        <Chip
          label="Zurücksetzen"
          onPress={onReset}
          accessibilityLabel="Alle Filter zurücksetzen"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0, marginTop: Spacing.two },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center' },
});
