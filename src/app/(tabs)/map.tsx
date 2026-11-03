import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResultsMap } from '@/components/place/results-map';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  locationLabel,
  searchCenter,
  searchStore,
  useSearch,
  useSearchRadius,
} from '@/store/search-store';

/** Vollbild-Karte mit den Treffern der aktuellen Suche (Favoriten folgen in Phase 6). */
export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const results = useSearch((s) => s.results);
  const status = useSearch((s) => s.status);
  const text = useSearch((s) => s.text.trim());
  const userLocation = useSearch((s) => s.userLocation);
  const label = useSearch(locationLabel);
  const center = useSearch(searchCenter);
  const radius = useSearchRadius();

  const title = text ? `„${text}“ · ${label}` : label;
  const headerTop = insets.top + Spacing.two;

  return (
    <View style={styles.screen}>
      <ResultsMap
        places={results}
        center={center}
        radiusMeters={radius}
        userLocation={userLocation}
        onSearchArea={searchStore.getState().selectArea}
        topInset={headerTop + 56}
      />
      <View
        style={[styles.header, { top: headerTop, backgroundColor: theme.background }]}
        accessibilityRole="header">
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {status === 'loading' ? 'Suche läuft …' : `${results.length} Treffer`}
          </ThemedText>
        </View>
        {status === 'loading' && <ActivityIndicator color={theme.accent} />}
      </View>
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
