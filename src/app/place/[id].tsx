import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataAttribution } from '@/components/data-attribution';
import { ActionButtons, type Action } from '@/components/detail/action-buttons';
import { AttributeList } from '@/components/detail/attribute-list';
import { MiniMap } from '@/components/detail/mini-map';
import { FavoriteButton } from '@/components/favorites/favorite-button';
import { FavoriteEditor } from '@/components/favorites/favorite-editor';
import { OpeningHoursList } from '@/components/detail/opening-hours-list';
import { PhotoGallery } from '@/components/detail/photo-gallery';
import { RatingSummary } from '@/components/detail/rating-summary';
import { ExternalLinkRow, ReviewList } from '@/components/detail/review-list';
import { Section } from '@/components/detail/section';
import { SearchError } from '@/components/state/search-error';
import { StateMessage } from '@/components/state/state-message';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { usePlaceDetails } from '@/hooks/use-place-details';
import { useTheme } from '@/hooks/use-theme';
import { mayShowDetailsOnMap } from '@/services/places/map-rules';
import { placeholderFor } from '@/services/placeholders/placeholders';
import { useSearch } from '@/store/search-store';
import { useSettings } from '@/store/settings-store';
import type { PlaceDetails, PlaceSummary } from '@/types/place';
import { formatPriceLevel } from '@/utils/format';
import { directionsUrl, displayUrl, mapsPlatform, phoneUrl } from '@/utils/links';
import { describeOpenState } from '@/utils/opening-hours';
import { placeStatus, type StatusTone } from '@/utils/place-labels';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const state = usePlaceDetails(id);
  // Aus der Trefferliste sofort Name und Foto zeigen, während die Details laden.
  const summary = useSearch((s) => s.results.find((p) => p.id === id) ?? null);
  const [now] = useState(() => new Date());

  const details = state.status === 'success' ? state.details : null;
  const place: PlaceSummary | null = details ?? summary;

  const backButton = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
      hitSlop={8}
      style={[styles.back, { top: insets.top + Spacing.two, backgroundColor: theme.background }]}>
      <Icon name="back" size={20} color={theme.text} />
    </Pressable>
  );

  if (!place) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        {state.status === 'error' ? (
          state.error.kind === 'not_found' ? (
            <StateMessage
              icon="warning"
              title="Ort nicht gefunden"
              message="Dieser Ort existiert nicht mehr oder ist nicht verfügbar."
            />
          ) : (
            <SearchError error={state.error} onRetry={state.retry} />
          )
        ) : (
          <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
            Lädt …
          </ThemedText>
        )}
        {backButton}
      </View>
    );
  }

  const placeholder = place.photo ? null : placeholderFor(place);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five }}>
        {place.source === 'osm' && !place.photo && !placeholder ? (
          // Keine Fotos in OSM und kein Symbolbild: nur Platz für die schwebenden Buttons.
          <View style={{ height: insets.top + Spacing.six }} />
        ) : (
          <PhotoGallery
            photos={details?.photos ?? (place.photo ? [place.photo] : [])}
            placeholder={placeholder}
          />
        )}
        <Header place={place} details={details} now={now} />

        {state.status === 'error' && <SearchError error={state.error} onRetry={state.retry} />}
        {state.status === 'loading' && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.loading}
            accessibilityLiveRegion="polite">
            Details werden geladen …
          </ThemedText>
        )}
        {details && <DetailSections details={details} now={now} />}
        {details && <DataAttribution source={details.source} />}
      </ScrollView>
      {backButton}
      <View style={[styles.favorite, { top: insets.top + Spacing.two }]}>
        <FavoriteButton placeId={place.id} placeName={place.name} />
      </View>
    </View>
  );
}

function Header({
  place,
  details,
  now,
}: {
  place: PlaceSummary;
  details: PlaceDetails | null;
  now: Date;
}) {
  const theme = useTheme();
  const status = placeStatus(place.openNow, place.businessStatus);
  const toneColor: Record<StatusTone, string> = {
    success: theme.success,
    neutral: theme.textSecondary,
    warning: theme.warning,
    danger: theme.danger,
  };

  // „Schließt um …“ nur zeigen, wenn es zur Angabe der API passt (Feiertage etc.).
  const openState =
    details?.openingHours && place.businessStatus === 'operational'
      ? describeOpenState(details.openingHours.periods, now)
      : null;
  const timeHint =
    openState && (place.openNow === null || openState.open === place.openNow)
      ? openState.detail
      : null;

  const meta = [
    place.typeLabel,
    place.priceLevel !== null ? formatPriceLevel(place.priceLevel) : null,
  ].filter(Boolean);

  return (
    <View style={styles.header}>
      <ThemedText type="title" accessibilityRole="header" style={styles.name}>
        {place.name}
      </ThemedText>
      {meta.length > 0 && <ThemedText themeColor="textSecondary">{meta.join(' · ')}</ThemedText>}
      {status && (
        <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
          {status.label}
          {timeHint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              · {timeHint}
            </ThemedText>
          ) : null}
        </ThemedText>
      )}
      {place.businessStatus === 'closed_permanently' && (
        <View style={[styles.banner, { borderColor: theme.danger }]}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            Dieses Lokal ist laut Google dauerhaft geschlossen.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function DetailSections({ details, now }: { details: PlaceDetails; now: Date }) {
  const routeApp = useSettings((s) => s.routeApp);
  const route = () =>
    void Linking.openURL(
      directionsUrl(
        mapsPlatform(),
        details.location,
        details.name,
        routeApp,
        details.source === 'google' ? details.id : null,
      ),
    );
  const phone = details.internationalPhone ?? details.phone;

  const actions: Action[] = [
    {
      key: 'route',
      label: 'Route',
      icon: 'directions',
      onPress: route,
      accessibilityHint: 'Öffnet die Karten-App',
      primary: true,
    },
  ];
  if (phone) {
    actions.push({
      key: 'call',
      label: 'Anrufen',
      icon: 'phone',
      onPress: () => void Linking.openURL(phoneUrl(phone)),
      accessibilityHint: `Ruft ${details.phone ?? phone} an`,
    });
  }
  if (details.website) {
    const website = details.website;
    actions.push({
      key: 'website',
      label: 'Website',
      icon: 'website',
      onPress: () => void WebBrowser.openBrowserAsync(website),
      accessibilityHint: `Öffnet ${displayUrl(website)}`,
    });
  }

  return (
    <View>
      <View style={styles.actions}>
        <ActionButtons actions={actions} />
      </View>

      <Section title="Meine Notizen">
        <FavoriteEditor placeId={details.id} />
      </Section>

      <Section title="Bewertung">
        {details.source === 'osm' ? (
          <ThemedText type="small" themeColor="textSecondary">
            OpenStreetMap enthält keine Bewertungen. Deshalb gibt es hier weder Sterne noch
            Vertrauensscore – mit Google Places als Datenquelle (Einstellungen) schon.
          </ThemedText>
        ) : (
          <RatingSummary rating={details.rating} ratingCount={details.ratingCount} />
        )}
      </Section>

      <Section title="Öffnungszeiten">
        {details.openingHours && details.openingHours.weekdayDescriptions.length > 0 ? (
          <OpeningHoursList hours={details.openingHours} now={now} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Keine Öffnungszeiten angegeben.
          </ThemedText>
        )}
      </Section>

      <Section title="Angebot">
        <AttributeList attributes={details.attributes} />
      </Section>

      <Section title="Adresse">
        <View style={styles.addressRow}>
          <ThemedText selectable style={styles.address}>
            {details.formattedAddress ?? details.shortAddress ?? 'Keine Adresse angegeben'}
          </ThemedText>
        </View>
        {details.phone && (
          <ThemedText type="small" themeColor="textSecondary" selectable>
            Telefon: {details.phone}
          </ThemedText>
        )}
        {details.website && (
          <ThemedText type="small" themeColor="textSecondary" selectable>
            Website: {displayUrl(details.website)}
          </ThemedText>
        )}
        {/* EWR-Bedingungen: Google-Inhalte nicht zusammen mit einer Karte zeigen. */}
        {mayShowDetailsOnMap(details.source) && (
          <MiniMap location={details.location} onPress={route} />
        )}
      </Section>

      {details.source === 'osm' ? (
        <Section title="OpenStreetMap">
          <ThemedText type="small" themeColor="textSecondary">
            Die Angaben stammen von Freiwilligen und können veraltet sein. Fehlt etwas oder stimmt
            etwas nicht, lässt es sich direkt auf OpenStreetMap korrigieren.
          </ThemedText>
          {details.mapsUri && (
            <ExternalLinkRow
              label="Auf OpenStreetMap ansehen"
              onPress={() => void Linking.openURL(details.mapsUri!)}
            />
          )}
        </Section>
      ) : (
        <Section title="Neueste Rezensionen">
          <ReviewList reviews={details.reviews} source={details.source} />
          {details.mapsUri && (
            <ExternalLinkRow
              label="Alle Rezensionen in Google Maps"
              onPress={() => void Linking.openURL(details.mapsUri!)}
            />
          )}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  back: {
    position: 'absolute',
    left: Spacing.three,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  favorite: { position: 'absolute', right: Spacing.three },
  header: { padding: Spacing.three, paddingTop: Spacing.four, gap: Spacing.one },
  name: { fontSize: 28, lineHeight: 34 },
  banner: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
  loading: { paddingHorizontal: Spacing.three },
  actions: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  addressRow: { flexDirection: 'row', gap: Spacing.two },
  address: { flex: 1 },
});
