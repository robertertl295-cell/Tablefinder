import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/types/place';

/** Web-Vorschau: react-native-maps läuft im Browser nicht. */
export function MiniMap({ onPress }: { location: LatLng; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.frame, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        Karte nur in der App
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 160,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
