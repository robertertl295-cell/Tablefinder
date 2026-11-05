import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Section } from '@/components/detail/section';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useSheetInsets } from '@/hooks/use-sheet-insets';
import { useTheme } from '@/hooks/use-theme';
import { pickBackup, shareBackup } from '@/services/favorites-file';
import { favoritesStore, useFavorites } from '@/store/favorites-store';
import type { FavoriteList, FavoritesBackup } from '@/types/favorites';
import { LIST_NAME_SUGGESTIONS, MAX_LIST_NAME_LENGTH } from '@/utils/favorites';
import { showDialog } from '@/utils/dialog';

/** Listen anlegen, umbenennen, löschen sowie Favoriten sichern und wiederherstellen. */
export default function FavoritesManageSheet() {
  const theme = useTheme();
  const sheetInsets = useSheetInsets();
  const lists = useFavorites((s) => s.lists);
  const favoriteCount = useFavorites((s) => Object.keys(s.favorites).length);
  const [newName, setNewName] = useState('');
  const store = favoritesStore.getState();

  const create = (name: string) => {
    if (store.createList(name)) setNewName('');
  };
  const suggestions = LIST_NAME_SUGGESTIONS.filter(
    (s) => !lists.some((l) => l.name.toLowerCase() === s.toLowerCase()),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/favorites'));

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: sheetInsets.top }]}>
      <View style={styles.bar}>
        <ThemedText type="smallBold" accessibilityRole="header" style={styles.barTitle}>
          Favoriten verwalten
        </ThemedText>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Fertig, zurück zu den Favoriten"
          hitSlop={8}>
          <ThemedText type="link" style={styles.done}>
            Fertig
          </ThemedText>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Spacing.six + sheetInsets.bottom },
        ]}
        keyboardShouldPersistTaps="handled">
        <Section title="Listen">
          {lists.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Noch keine Listen. Favoriten können in mehreren Listen gleichzeitig stehen.
            </ThemedText>
          )}
          {lists.map((l) => (
            <ListRow key={l.id} list={l} />
          ))}
          <View style={styles.newRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={() => create(newName)}
              placeholder="Neue Liste, z. B. „Brunch“"
              placeholderTextColor={theme.textSecondary}
              maxLength={MAX_LIST_NAME_LENGTH}
              returnKeyType="done"
              accessibilityLabel="Name der neuen Liste"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            <Pressable
              onPress={() => create(newName)}
              disabled={!newName.trim()}
              accessibilityRole="button"
              accessibilityLabel="Liste anlegen"
              style={[
                styles.iconButton,
                { backgroundColor: theme.accent, opacity: newName.trim() ? 1 : 0.4 },
              ]}>
              <Icon name="plus" size={20} color={theme.onAccent} />
            </Pressable>
          </View>
          {suggestions.length > 0 && (
            <View style={styles.wrap}>
              {suggestions.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  onPress={() => create(s)}
                  accessibilityLabel={`Liste „${s}“ anlegen`}
                  icon={<Icon name="plus" size={14} color={theme.text} />}
                />
              ))}
            </View>
          )}
        </Section>

        <Section title="Sicherung">
          <ThemedText type="small" themeColor="textSecondary">
            Die Datei enthält deine Listen, Notizen, Bewertungen und die Google-IDs der Orte – keine
            Inhalte von Google.
          </ThemedText>
          <View style={styles.backupRow}>
            <BackupButton
              icon="share"
              label="Exportieren"
              disabled={favoriteCount === 0 && lists.length === 0}
              onPress={() => void exportFavorites()}
            />
            <BackupButton
              icon="import"
              label="Importieren"
              onPress={() => void importFavorites()}
            />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function ListRow({ list }: { list: FavoriteList }) {
  const theme = useTheme();
  const [name, setName] = useState(list.name);
  const count = useFavorites(
    (s) => Object.values(s.favorites).filter((f) => f.listIds.includes(list.id)).length,
  );
  const save = () => {
    if (name.trim()) favoritesStore.getState().renameList(list.id, name);
    else setName(list.name);
  };
  const remove = () =>
    showDialog(
      `Liste „${list.name}“ löschen?`,
      count > 0
        ? `Die ${count} Favoriten darin bleiben erhalten, nur die Liste verschwindet.`
        : undefined,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => favoritesStore.getState().deleteList(list.id),
        },
      ],
    );

  return (
    <View style={styles.newRow}>
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={save}
        onSubmitEditing={save}
        maxLength={MAX_LIST_NAME_LENGTH}
        accessibilityLabel={`Liste ${list.name} umbenennen`}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
        {count}
      </ThemedText>
      <Pressable
        onPress={remove}
        accessibilityRole="button"
        accessibilityLabel={`Liste ${list.name} löschen`}
        hitSlop={8}
        style={styles.iconButton}>
        <Icon name="trash" size={20} color={theme.danger} />
      </Pressable>
    </View>
  );
}

function BackupButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: 'share' | 'import';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.backupButton,
        { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={20} color={theme.accent} />
      <ThemedText type="smallBold" style={{ color: theme.accent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

async function exportFavorites() {
  try {
    const result = await shareBackup(favoritesStore.getState().exportBackup());
    if (result === 'unavailable') {
      showDialog('Teilen nicht möglich', 'Auf diesem Gerät ist kein Teilen-Menü verfügbar.');
    }
  } catch {
    showDialog('Export fehlgeschlagen', 'Die Sicherungsdatei konnte nicht erstellt werden.');
  }
}

async function importFavorites() {
  const result = await pickBackup();
  if (!result) return;
  if (!result.ok) {
    showDialog('Import nicht möglich', result.error);
    return;
  }
  const { backup, skipped } = result;
  const apply = (mode: 'merge' | 'replace') => {
    const { added, updated } = favoritesStore.getState().importBackup(backup, mode);
    showDialog('Import abgeschlossen', importSummary(backup, added, updated, skipped, mode));
  };
  showDialog(
    'Favoriten importieren',
    `${backup.favorites.length} Favoriten und ${backup.lists.length} Listen gefunden. ` +
      '„Zusammenführen“ behält deine aktuellen Favoriten, „Ersetzen“ löscht sie vorher.',
    [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Ersetzen', style: 'destructive', onPress: () => apply('replace') },
      { text: 'Zusammenführen', onPress: () => apply('merge') },
    ],
  );
}

function importSummary(
  backup: FavoritesBackup,
  added: number,
  updated: number,
  skipped: number,
  mode: 'merge' | 'replace',
): string {
  const parts =
    mode === 'replace'
      ? [`${backup.favorites.length} Favoriten wiederhergestellt.`]
      : [`${added} neu hinzugefügt, ${updated} aktualisiert.`];
  if (skipped > 0) parts.push(`${skipped} ungültige Einträge übersprungen.`);
  return parts.join(' ');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  barTitle: { fontSize: 17 },
  done: { fontWeight: 600 },
  content: { paddingTop: Spacing.one, paddingBottom: Spacing.six },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  count: { minWidth: 20, textAlign: 'right' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  backupRow: { flexDirection: 'row', gap: Spacing.two },
  backupButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
  },
});
