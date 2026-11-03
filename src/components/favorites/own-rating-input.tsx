import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { OwnRating } from '@/types/favorites';

const VALUES: OwnRating[] = [1, 2, 3, 4, 5];

/** Eigene Bewertung 1–5; erneutes Tippen auf denselben Stern entfernt sie. */
export function OwnRatingInput({
  value,
  onChange,
}: {
  value: OwnRating | null;
  onChange: (value: OwnRating | null) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel="Eigene Bewertung">
      {VALUES.map((v) => (
        <Pressable
          key={v}
          onPress={() => onChange(value === v ? null : v)}
          accessibilityRole="button"
          accessibilityLabel={`${v} ${v === 1 ? 'Stern' : 'Sterne'}`}
          accessibilityState={{ selected: value === v }}
          hitSlop={4}
          style={styles.star}>
          <Icon
            name="star"
            size={28}
            color={value !== null && v <= value ? theme.accent : theme.backgroundSelected}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.one },
  star: { padding: Spacing.one },
});
