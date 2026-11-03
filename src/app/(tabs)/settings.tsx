import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Section } from '@/components/detail/section';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { config } from '@/services/config';
import { deleteAllLocalData } from '@/services/local-data';
import { filterStore } from '@/store/filter-store';
import { RADIUS_SETTING_OPTIONS, settingsStore, useSettings } from '@/store/settings-store';
import { formatDistance, type Units } from '@/utils/format';

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: 'metric', label: 'Kilometer' },
  { value: 'imperial', label: 'Meilen' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const radius = useSettings((s) => s.defaultRadiusMeters);
  const units = useSettings((s) => s.units);
  const version = Constants.expoConfig?.version ?? '–';

  const changeRadius = (next: number) => {
    const previous = settingsStore.getState().defaultRadiusMeters;
    settingsStore.getState().setDefaultRadius(next);
    // Wer den Umkreis nie geändert hat, bekommt den neuen Standard direkt in der Suche.
    const { filters, setFilters } = filterStore.getState();
    if (filters.radiusMeters === previous) setFilters({ ...filters, radiusMeters: next });
  };

  const confirmDelete = () =>
    Alert.alert(
      'Alle lokalen Daten löschen?',
      'Favoriten, Listen, Notizen, eigene Bewertungen, Filter und Einstellungen werden ' +
        'unwiderruflich gelöscht. Erstelle vorher eine Sicherung, wenn du sie behalten möchtest.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: () => {
            deleteAllLocalData();
            Alert.alert('Gelöscht', 'Alle lokalen Daten wurden entfernt.');
          },
        },
      ],
    );

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          Einstellungen
        </ThemedText>

        <Section title="Suche">
          <ThemedText type="smallBold">Standard-Umkreis</ThemedText>
          <View style={styles.wrap}>
            {RADIUS_SETTING_OPTIONS.map((r) => (
              <Chip
                key={r}
                label={formatDistance(r, units)}
                selected={radius === r}
                onPress={() => changeRadius(r)}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Gilt für neue Suchen und beim Zurücksetzen der Filter.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.subheading}>
            Einheiten
          </ThemedText>
          <View style={styles.wrap}>
            {UNIT_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={units === o.value}
                onPress={() => settingsStore.getState().setUnits(o.value)}
              />
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.subheading}>
            Sprache
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Deutsch. Ortsdaten und Öffnungszeiten werden ebenfalls auf Deutsch abgefragt.
          </ThemedText>
        </Section>

        <Section title="Daten">
          <Row
            icon="share"
            label="Favoriten sichern oder wiederherstellen"
            onPress={() => router.push('/favorites-manage')}
          />
          <Row
            icon="trash"
            label="Alle lokalen Daten löschen"
            destructive
            onPress={confirmDelete}
          />
        </Section>

        <Section title="Datenschutz">
          <Paragraph>
            Tisch hat keine eigenen Server, keine Konten und kein Tracking. Favoriten, Listen,
            Notizen, Filter und Einstellungen bleiben ausschließlich auf diesem Gerät.
          </Paragraph>
          <Paragraph>
            Für die Suche werden Suchbegriff und Suchort (dein Standort oder der gewählte Bezirk)
            direkt an Google Places übertragen. Es gelten die Datenschutzbestimmungen von Google.
          </Paragraph>
          <Paragraph>
            Der Standort wird nur abgefragt, während du die App benutzt, und nicht gespeichert.
            Fotos, Bewertungen und Rezensionen von Google werden nur kurz im Arbeitsspeicher
            gehalten und nie dauerhaft abgelegt.
          </Paragraph>
          <Row
            icon="external"
            label="Datenschutzerklärung von Google"
            onPress={() => void Linking.openURL('https://policies.google.com/privacy?hl=de')}
          />
        </Section>

        <Section title="Über">
          <Paragraph>
            Datenquelle:{' '}
            {config.dataSource === 'google'
              ? 'Google Places (API-Schlüssel hinterlegt)'
              : 'Beispieldaten – kein API-Schlüssel hinterlegt'}
          </Paragraph>
          <Paragraph>Version {version}</Paragraph>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

function Row({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={18} color={color} />
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: Spacing.six },
  title: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subheading: { marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
});
