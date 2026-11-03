import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { placesProvider } from '@/services/places';

/** Quellenangabe unter Ergebnislisten (Pflicht bei Google-Daten außerhalb einer Google-Karte). */
export function DataAttribution() {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
      {placesProvider.source === 'google'
        ? 'Daten: Google Maps'
        : 'Beispieldaten – kein API-Schlüssel hinterlegt'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center', paddingVertical: Spacing.three },
});
