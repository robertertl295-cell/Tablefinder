import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FilterButton } from '@/components/filters/filter-button';
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
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { filterStore, useFilters } from '@/store/filter-store';
import { settingsStore, useSettings } from '@/store/settings-store';
import {
  locationLabel,
  searchCenter,
  searchStore,
  useSearch,
  useSearchRadius,
} from '@/store/search-store';
import { activeFilterChips } from '@/utils/filters';
import { RESULT_SORT_LABEL, sortPlaces } from '@/utils/sort-places';

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
  const radius = useSearchRadius();
  const filters = useFilters((s) => s.filters);
  const defaultRadius = useSettings((s) => s.defaultRadiusMeters);
  const units = useSettings((s) => s.units);
  const resultSort = useSettings((s) => s.resultSort);
  const sortedResults = useMemo(
    () => sortPlaces(results, resultSort, userLocation),
    [results, resultSort, userLocation],
  );
  const sortLabel =
    resultSort === 'relevance'
      ? null
      : resultSort === 'distance' && !userLocation
        ? 'Entfernung (Standort fehlt)'
        : `Nach ${RESULT_SORT_LABEL[resultSort]}`;
  const chips = activeFilterChips(filters, defaultRadius, units);

  // Android liest die Trefferzeile über accessibilityLiveRegion vor, iOS braucht eine Ansage.
  const resultCount = results.length;
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (status === 'success') {
      AccessibilityInfo.announceForAccessibility(
        resultCount === 0 ? 'Keine Treffer' : `${resultCount} Treffer`,
      );
    } else if (status === 'error') {
      AccessibilityInfo.announceForAccessibility('Suche fehlgeschlagen');
    }
  }, [status, resultCount]);

  const isInitialLoading = (status === 'loading' || status === 'idle') && results.length === 0;
  const summary = isInitialLoading
    ? 'Suche läuft …'
    : `${results.length}${hasMore ? '+' : ''} Treffer · ${label}`;

  const empty = isInitialLoading ? (
    <View style={styles.skeletons}>
      <PlaceCardSkeleton />
      <PlaceCardSkeleton />
    </View>
  ) : (
    <StateMessage
      icon="empty"
      title={text.trim() ? `Keine Treffer für „${text.trim()}“` : 'Hier ist nichts zu finden'}
      message={
        chips.length > 0
          ? 'Lockere die Filter oder wähle einen anderen Ort.'
          : 'Probiere einen anderen Begriff oder wähle einen anderen Ort.'
      }
      actionLabel={chips.length > 0 ? 'Filter zurücksetzen' : undefined}
      onAction={filterStore.getState().reset}
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
      <ActiveFilterChips
        leading={
          <>
            <FilterButton activeCount={chips.length} onPress={() => router.push('/filters')} />
            {sortLabel && (
              <Chip
                label={sortLabel}
                selected
                onPress={() => settingsStore.getState().setResultSort('relevance')}
                accessibilityLabel={`Sortierung ${sortLabel}. Zurück zu Relevanz`}
                trailing={<Icon name="close" size={14} color={theme.onAccent} />}
              />
            )}
          </>
        }
        chips={chips}
        filters={filters}
        onChange={filterStore.getState().setFilters}
        onReset={filterStore.getState().reset}
      />

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
            places={sortedResults}
            userLocation={userLocation}
            showTrustScore={resultSort === 'trust'}
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
