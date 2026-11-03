import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceCardSkeleton } from '@/components/place/place-card-skeleton';
import { PlaceList } from '@/components/place/place-list';
import { ResultsMap } from '@/components/place/results-map';
import { LocationNotice } from '@/components/search/location-notice';
import { LocationPicker } from '@/components/search/location-picker';
import { SearchBar } from '@/components/search/search-bar';
import { ViewToggle } from '@/components/search/view-toggle';
import { SearchError } from '@/components/state/search-error';
import { StateMessage } from '@/components/state/state-message';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  locationLabel,
  searchCenter,
  searchRadius,
  searchStore,
  useSearch,
} from '@/store/search-store';

const actions = () => searchStore.getState();

export default function SearchScreen() {
  const theme = useTheme();
  const text = useSearch((s) => s.text);
  const selection = useSearch((s) => s.selection);
  const viewMode = useSearch((s) => s.viewMode);
  const results = useSearch((s) => s.results);
  const status = useSearch((s) => s.status);
  const error = useSearch((s) => s.error);
  const hasMore = useSearch((s) => s.nextPageToken !== null);
  const isLoadingMore = useSearch((s) => s.isLoadingMore);
  const isRefreshing = useSearch((s) => s.isRefreshing);
  const userLocation = useSearch((s) => s.userLocation);
  const locationStatus = useSearch((s) => s.locationStatus);
  const label = useSearch(locationLabel);
  const center = useSearch(searchCenter);
  const radius = useSearch(searchRadius);

  const isInitialLoading = (status === 'loading' || status === 'idle') && results.length === 0;
  const summary = isInitialLoading
    ? 'Suche läuft …'
    : `${results.length}${hasMore ? '+' : ''} ${results.length === 1 ? 'Treffer' : 'Treffer'} · ${label}`;

  const empty = isInitialLoading ? (
    <View style={styles.skeletons}>
      <PlaceCardSkeleton />
      <PlaceCardSkeleton />
    </View>
  ) : (
    <StateMessage
      icon="empty"
      title={text.trim() ? `Keine Treffer für „${text.trim()}“` : 'Hier ist nichts zu finden'}
      message="Probiere einen anderen Begriff oder wähle einen anderen Ort."
    />
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <SearchBar
          value={text}
          onChangeText={actions().setText}
          onSubmit={() => void actions().search()}
        />
      </View>
      <LocationPicker
        selection={selection}
        onSelectCurrent={actions().selectCurrentLocation}
        onSelectDistrict={actions().selectDistrict}
      />
      {selection.mode === 'current' && <LocationNotice status={locationStatus} />}
      <View style={styles.summaryRow}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={styles.summary}
          accessibilityLiveRegion="polite">
          {summary}
        </ThemedText>
        <ViewToggle value={viewMode} onChange={actions().setViewMode} />
      </View>

      <View style={styles.content}>
        {status === 'error' && error ? (
          <SearchError error={error} onRetry={() => void actions().search()} />
        ) : viewMode === 'map' ? (
          <ResultsMap
            places={results}
            center={center}
            radiusMeters={radius}
            userLocation={userLocation}
            onSearchArea={actions().selectArea}
          />
        ) : (
          <PlaceList
            places={results}
            userLocation={userLocation}
            isLoadingMore={isLoadingMore}
            isRefreshing={isRefreshing}
            onEndReached={() => void actions().loadMore()}
            onRefresh={() => void actions().refresh()}
            ListEmptyComponent={empty}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  summary: { flex: 1 },
  content: { flex: 1 },
  skeletons: { gap: Spacing.three },
});
