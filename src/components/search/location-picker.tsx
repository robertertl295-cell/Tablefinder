import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { DISTRICTS } from '@/constants/districts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocationSelection } from '@/store/search-store';

type Props = {
  selection: LocationSelection;
  onSelectCurrent: () => void;
  onSelectDistrict: (id: string) => void;
};

/** Horizontale Auswahl: eigener Standort oder ein Berliner Ortsteil. */
export function LocationPicker({ selection, onSelectCurrent, onSelectDistrict }: Props) {
  const theme = useTheme();
  const isCurrent = selection.mode === 'current';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      accessibilityLabel="Ort der Suche">
      <Chip
        label="In meiner Nähe"
        selected={isCurrent}
        onPress={onSelectCurrent}
        icon={<Icon name="location" size={14} color={isCurrent ? theme.onAccent : theme.text} />}
      />
      {DISTRICTS.map((d) => (
        <Chip
          key={d.id}
          label={d.name}
          selected={selection.mode === 'district' && selection.districtId === d.id}
          onPress={() => onSelectDistrict(d.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Ohne flexGrow: 0 dehnt sich eine horizontale ScrollView in der Höhe aus.
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center' },
});
