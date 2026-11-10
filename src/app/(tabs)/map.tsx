import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapWithSheet } from '@/components/place/map-with-sheet';
import { ThemedText } from '@/components/themed-text';
import { PLACES_ERROR_MESSAGE } from '@/services/places/errors';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  locationLabel,
  searchCenter,
  searchStore,
  useSearch,
  useSearchRadius,
} from '@/store/search-store';

/** Vollbild-Karte mit den Treffern der aktuellen Suche (Favoriten haben eine eigene Kartenansicht). */
export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const results = useSearch((s) => s.results);
  const hasMore = useSearch((s) => s.nextPageToken !== null);
  const status = useSearch((s) => s.status);
  const error = useSearch((s) => s.error);
  const text = useSearch((s) => s.text.trim());
  const userLocation = useSearch((s) => s.userLocation);
  const label = useSearch(locationLabel);
  const center = useSearch(searchCenter);
  const radius = useSearchRadius();

  const title = text ? `„${text}“ · ${label}` : label;
  const headerTop = insets.top + Spacing.two;

  const summary =
    status === 'loading'
      ? 'Suche läuft …'
      : status === 'error' && error
        ? PLACES_ERROR_MESSAGE[error.kind]
        : results.length === 0
          ? 'Keine Treffer – verschiebe die Karte oder ändere die Filter.'
          : `${results.length}${hasMore ? '+' : ''} Treffer`;

  return (
    <View style={styles.screen}>
      <MapWithSheet
        places={results}
        center={center}
        radiusMeters={radius}
        userLocation={userLocation}
        onSearchArea={searchStore.getState().selectArea}
        topInset={headerTop + 56}
        summary={summary}
        onEndReached={() => void searchStore.getState().loadMore()}
        overlay={
          <View
            style={[styles.header, { top: headerTop, backgroundColor: theme.background }]}
            accessibilityRole="header">
            <View style={styles.headerText}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {title}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={status === 'error' && { color: theme.danger }}
                accessibilityLiveRegion="polite">
                {summary}
              </ThemedText>
            </View>
            {status === 'loading' && <ActivityIndicator color={theme.accent} />}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerText: { flex: 1 },
});
