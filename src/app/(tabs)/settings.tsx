import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Section } from '@/components/detail/section';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useActiveSource } from '@/hooks/use-active-source';
import { useTheme } from '@/hooks/use-theme';
import { config } from '@/services/config';
import { SOURCE_LABEL } from '@/services/places/capabilities';
import { deleteAllLocalData } from '@/services/local-data';
import { filterStore } from '@/store/filter-store';
import {
  RADIUS_SETTING_OPTIONS,
  settingsStore,
  useSettings,
  type SourcePreference,
} from '@/store/settings-store';
import type { DataSource } from '@/types/place';
import { formatDistance, type Units } from '@/utils/format';
import { showDialog } from '@/utils/dialog';

const SOURCE_OPTIONS: { value: SourcePreference; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'google', label: 'Google Places' },
  { value: 'osm', label: 'OpenStreetMap' },
  { value: 'mock', label: 'Beispieldaten' },
];

const SOURCE_DESCRIPTION: Record<DataSource, string> = {
  google:
    'Mit Bewertungen, Fotos, Rezensionen und Preisen. Kostenpflichtig nach Nutzung, braucht einen API-Schlüssel.',
  osm: 'Kostenlos und ohne Schlüssel, von Freiwilligen gepflegt, täglich aktualisiert. Kennt vegane Angebote, aber keine Bewertungen, Preise oder Fotos. Daten © OpenStreetMap-Mitwirkende (ODbL).',
  mock: '18 erfundene Berliner Lokale zum Ausprobieren, ohne Internet.',
};

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: 'metric', label: 'Kilometer' },
  { value: 'imperial', label: 'Meilen' },
];

export default function SettingsScreen() {
  const radius = useSettings((s) => s.defaultRadiusMeters);
  const units = useSettings((s) => s.units);
  const version = Constants.expoConfig?.version ?? '–';
  const dataSource = useSettings((s) => s.dataSource);
  const activeSource = useActiveSource();
  const hasGoogleKey = config.placesApiKey !== null;

  const changeRadius = (next: number) => {
    const previous = settingsStore.getState().defaultRadiusMeters;
    settingsStore.getState().setDefaultRadius(next);
    // Wer den Umkreis nie geändert hat, bekommt den neuen Standard direkt in der Suche.
    const { filters, setFilters } = filterStore.getState();
    if (filters.radiusMeters === previous) setFilters({ ...filters, radiusMeters: next });
  };

  const confirmDelete = () =>
    showDialog(
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
            showDialog('Gelöscht', 'Alle lokalen Daten wurden entfernt.');
          },
        },
      ],
    );

  return (
    <Screen>
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

        <Section title="Datenquelle">
          <View style={styles.wrap}>
            {SOURCE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={dataSource === o.value}
                accessibilityHint={
                  o.value === 'google' && !hasGoogleKey ? 'Benötigt einen API-Schlüssel' : undefined
                }
                onPress={() => {
                  if (o.value === 'google' && !hasGoogleKey) {
                    showDialog(
                      'Kein API-Schlüssel',
                      'Für Google Places muss EXPO_PUBLIC_PLACES_API_KEY in der .env-Datei gesetzt sein (siehe README). Bis dahin sucht die App mit OpenStreetMap.',
                    );
                    return;
                  }
                  settingsStore.getState().setDataSource(o.value);
                }}
              />
            ))}
          </View>
          <ThemedText type="smallBold">Aktiv: {SOURCE_LABEL[activeSource]}</ThemedText>
          <Paragraph>{SOURCE_DESCRIPTION[activeSource]}</Paragraph>
          <Paragraph>
            Favoriten aus allen Quellen bleiben erhalten und werden jeweils aus ihrer Quelle
            geladen.
          </Paragraph>
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
            Tablefinder hat keine eigenen Server, keine Konten und kein Tracking. Favoriten, Listen,
            Notizen, Filter und Einstellungen bleiben ausschließlich auf diesem Gerät.
          </Paragraph>
          <Paragraph>
            Bei Google Places werden Suchbegriff und Suchort (dein Standort oder der gewählte
            Bezirk) an Google übertragen. Bei OpenStreetMap lädt die App einmal einen Datensatz
            aller Berliner Lokale von ihrer eigenen Seite (GitHub Pages) und sucht darin auf dem
            Gerät – dein Standort und deine Suche verlassen es dabei nicht. Nur wenn der Datensatz
            nicht erreichbar ist, fragt sie öffentliche Overpass-Server (overpass-api.de,
            ersatzweise overpass.private.coffee oder overpass.kumi.systems) mit dem Suchort. Es
            gelten die Bestimmungen des jeweiligen Dienstes.
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
          <Row
            icon="external"
            label="Datenschutz der OpenStreetMap Foundation"
            onPress={() => void Linking.openURL('https://osmfoundation.org/wiki/Privacy_Policy')}
          />
        </Section>

        <Section title="Über">
          <Paragraph>
            Google-API-Schlüssel: {hasGoogleKey ? 'hinterlegt' : 'nicht hinterlegt'}
          </Paragraph>
          <Paragraph>Version {version}</Paragraph>
        </Section>
      </ScrollView>
    </Screen>
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
