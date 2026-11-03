import { router } from 'expo-router';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { DataAttribution } from '@/components/data-attribution';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng, PlaceSummary } from '@/types/place';
import { distanceMeters } from '@/utils/geo';

import { PlaceCard } from './place-card';

type Props = {
  places: PlaceSummary[];
  userLocation: LatLng | null;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  ListEmptyComponent?: ReactElement;
  showTrustScore?: boolean;
};

export function PlaceList({
  places,
  userLocation,
  isLoadingMore,
  isRefreshing,
  onEndReached,
  onRefresh,
  ListEmptyComponent,
  showTrustScore = false,
}: Props) {
  const theme = useTheme();
  return (
    <FlatList
      data={places}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PlaceCard
          place={item}
          distanceMeters={userLocation ? distanceMeters(userLocation, item.location) : null}
          showTrustScore={showTrustScore}
          onPress={() => router.push({ pathname: '/place/[id]', params: { id: item.id } })}
        />
      )}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.accent} />
      }
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        places.length > 0 ? (
          <View>
            {isLoadingMore && (
              <ActivityIndicator
                style={styles.spinner}
                color={theme.accent}
                accessibilityLabel="Weitere Treffer werden geladen"
              />
            )}
            <DataAttribution />
          </View>
        ) : undefined
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, flexGrow: 1 },
  separator: { height: Spacing.three },
  spinner: { paddingVertical: Spacing.three },
});
