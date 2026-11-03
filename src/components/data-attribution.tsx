import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DataSource } from '@/types/place';

const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';

/**
 * Quellenangabe unter Ergebnislisten und Details.
 * Google: Pflicht außerhalb einer Google-Karte. OSM: Pflicht nach ODbL, mit Link zur Lizenz.
 */
export function DataAttribution({ source }: { source: DataSource }) {
  const theme = useTheme();
  if (source === 'osm') {
    return (
      <Pressable
        onPress={() => void Linking.openURL(OSM_COPYRIGHT)}
        accessibilityRole="link"
        accessibilityLabel="Daten von OpenStreetMap-Mitwirkenden, Lizenz ODbL"
        style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          Daten: ©{' '}
          <ThemedText type="small" style={{ color: theme.accent }}>
            OpenStreetMap-Mitwirkende
          </ThemedText>{' '}
          (ODbL)
        </ThemedText>
      </Pressable>
    );
  }
  return (
    <ThemedText type="small" themeColor="textSecondary" style={[styles.text, styles.container]}>
      {source === 'google' ? 'Daten: Google Maps' : 'Beispieldaten – keine echte Datenquelle'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.three },
  text: { textAlign: 'center' },
});
