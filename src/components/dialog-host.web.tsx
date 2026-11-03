import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dialogStore, useCurrentDialog, type DialogButton } from '@/store/dialog-store';

/** Dialogfenster für die Web-Version, im Stil der App. Einmal im Root-Layout einbinden. */
export function DialogHost() {
  const theme = useTheme();
  const dialog = useCurrentDialog();
  if (!dialog) return null;

  const press = (button: DialogButton) => {
    dialogStore.setState({ current: null });
    button.onPress?.();
  };
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  // Wie bei iOS: Abbrechen zuletzt, Hauptaktion oben.
  const ordered = [
    ...dialog.buttons.filter((b) => b.style !== 'cancel'),
    ...(cancel ? [cancel] : []),
  ];

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => cancel && press(cancel)}
        accessibilityLabel="Dialog schließen"
        accessible={!!cancel}
      />
      <View
        style={[styles.card, { backgroundColor: theme.background }]}
        accessibilityRole="alert"
        aria-modal>
        <ThemedText type="subtitle" style={styles.center}>
          {dialog.title}
        </ThemedText>
        {dialog.message ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {dialog.message}
          </ThemedText>
        ) : null}
        <View style={styles.buttons}>
          {ordered.map((b) => {
            const color =
              b.style === 'destructive'
                ? theme.danger
                : b.style === 'cancel'
                  ? theme.textSecondary
                  : theme.accent;
            return (
              <Pressable
                key={b.text}
                onPress={() => press(b)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color }}>
                  {b.text}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  center: { textAlign: 'center' },
  buttons: { gap: Spacing.two, marginTop: Spacing.two },
  button: {
    minHeight: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
