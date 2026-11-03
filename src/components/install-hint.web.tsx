import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DISMISSED_KEY = 'tablefinder.installHintDismissed';

/** iPhone/iPad in Safari, aber noch nicht als Web-App vom Home-Bildschirm gestartet? */
export function shouldShowInstallHint(
  userAgent: string,
  standalone: boolean,
  dismissed: boolean,
): boolean {
  const iOS = /iPhone|iPad|iPod/.test(userAgent);
  return iOS && !standalone && !dismissed;
}

function readState(): boolean {
  try {
    const nav = globalThis.navigator as Navigator & { standalone?: boolean };
    const standalone =
      nav?.standalone === true || globalThis.matchMedia?.('(display-mode: standalone)').matches;
    const dismissed = globalThis.localStorage?.getItem(DISMISSED_KEY) === '1';
    return shouldShowInstallHint(nav?.userAgent ?? '', !!standalone, dismissed);
  } catch {
    return false;
  }
}

/** Anleitung „Zum Home-Bildschirm“, damit Tablefinder wie eine App startet. */
export function InstallHint() {
  const theme = useTheme();
  const [visible, setVisible] = useState(readState);
  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      globalThis.localStorage?.setItem(DISMISSED_KEY, '1');
    } catch {
      // Speichern nicht möglich (privater Modus) – dann erscheint der Hinweis eben wieder.
    }
  };

  return (
    <View
      style={[styles.box, { backgroundColor: theme.accent }]}
      accessibilityRole="summary"
      accessibilityLabel="Tablefinder als App nutzen: In Safari auf Teilen tippen und Zum Home-Bildschirm wählen.">
      <Icon name="share" size={20} color={theme.onAccent} />
      <View style={styles.text}>
        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
          Tablefinder als App nutzen
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.onAccent }}>
          Tippe in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“.
        </ThemedText>
      </View>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Hinweis schließen"
        hitSlop={10}>
        <Icon name="close" size={20} color={theme.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  text: { flex: 1, gap: 2 },
});
