import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocationStatus } from '@/store/search-store';

/** Hinweis, wenn „In meiner Nähe“ gewählt ist, der Standort aber fehlt. */
export function LocationNotice({ status }: { status: LocationStatus }) {
  const theme = useTheme();
  if (status !== 'denied' && status !== 'unavailable') return null;

  const denied = status === 'denied';
  const message = denied
    ? 'Standort nicht freigegeben – wir suchen in Berlin-Mitte.'
    : 'Standort nicht verfügbar – wir suchen in Berlin-Mitte.';

  return (
    <Pressable
      onPress={denied ? () => void Linking.openSettings() : undefined}
      disabled={!denied}
      accessibilityRole={denied ? 'button' : 'text'}
      accessibilityHint={
        denied ? 'Öffnet die Einstellungen, um den Standort freizugeben' : undefined
      }
      style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
      <Icon name="location" size={14} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {message}
        {denied ? ' ' : ''}
        {denied ? (
          <ThemedText type="link" style={styles.link}>
            Freigeben
          </ThemedText>
        ) : null}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  text: { flex: 1 },
  link: { fontSize: 14, lineHeight: 20 },
});
