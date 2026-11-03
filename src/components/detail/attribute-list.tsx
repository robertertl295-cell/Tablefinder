import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlaceAttributes } from '@/types/place';
import { ATTRIBUTE_LABEL, ATTRIBUTE_OPTIONS, MEAL_LABEL, MEAL_OPTIONS } from '@/utils/filters';

const ITEMS: { key: keyof PlaceAttributes; label: string }[] = [
  ...ATTRIBUTE_OPTIONS.map((k) => ({ key: k, label: ATTRIBUTE_LABEL[k] })),
  ...MEAL_OPTIONS.map((k) => ({ key: k, label: MEAL_LABEL[k] })),
];

/** Bekannte Angebots-Merkmale; fehlende Angaben werden weggelassen statt geraten. */
export function AttributeList({ attributes }: { attributes: PlaceAttributes }) {
  const theme = useTheme();
  const known = ITEMS.filter((i) => attributes[i.key] !== null);
  if (known.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Zu diesem Lokal liegen keine Angaben vor.
      </ThemedText>
    );
  }
  return (
    <View style={styles.wrap}>
      {known.map(({ key, label }) => {
        const yes = attributes[key] === true;
        return (
          <View
            key={key}
            style={[styles.item, { backgroundColor: theme.backgroundElement }]}
            accessible
            accessibilityLabel={`${label}: ${yes ? 'ja' : 'nein'}`}>
            <Icon
              name={yes ? 'check' : 'cross'}
              size={14}
              color={yes ? theme.success : theme.textSecondary}
            />
            <ThemedText
              type="small"
              themeColor={yes ? 'text' : 'textSecondary'}
              style={!yes && styles.no}>
              {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
  },
  no: { textDecorationLine: 'line-through' },
});
