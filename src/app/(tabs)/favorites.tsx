import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FavoriteCard } from '@/components/favorites/favorite-card';
import { ResultsMap } from '@/components/place/results-map';
import { ViewToggle } from '@/components/search/view-toggle';
import { StateMessage } from '@/components/state/state-message';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useFavoritePlaces } from '@/hooks/use-favorite-places';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_LOCATION } from '@/services/config';
import { useFavorites } from '@/store/favorites-store';
import type { ViewMode } from '@/store/search-store';
import { useSearch } from '@/store/search-store';
import type { PlaceSummary } from '@/types/place';
import {
  selectFavorites,
  SORT_LABEL,
  VISIT_LABEL,
  type FavoriteSort,
  type VisitFilter,
} from '@/utils/favorites';
import { circleAround } from '@/utils/map-region';

const SORTS = Object.keys(SORT_LABEL) as FavoriteSort[];
const VISITS = Object.keys(VISIT_LABEL) as VisitFilter[];

export default function FavoritesScreen() {
  const theme = useTheme();
  const favoritesById = useFavorites((s) => s.favorites);
  const lists = useFavorites((s) => s.lists);
  const userLocation = useSearch((s) => s.userLocation);

  const [listId, setListId] = useState<string | null>(null);
  const [visit, setVisit] = useState<VisitFilter>('all');
  const [sort, setSort] = useState<FavoriteSort>('added');
  const [showSort, setShowSort] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const all = useMemo(() => Object.values(favoritesById), [favoritesById]);
  const ids = useMemo(() => all.map((f) => f.placeId).sort(), [all]);
  const { get, results, reload } = useFavoritePlaces(ids);

  const places = useMemo(() => {
    const map = new Map<string, PlaceSummary>();
    for (const [id, entry] of Object.entries(results)) {
      if (entry.status === 'loaded') map.set(id, entry.place);
    }
    return map;
  }, [results]);

  // Liste existiert nicht mehr (gelöscht) → zurück auf „Alle“.
  const activeListId = listId && lists.some((l) => l.id === listId) ? listId : null;
  const visible = selectFavorites(all, { listId: activeListId, visit, sort }, places, userLocation);
  const visiblePlaces = visible
    .map((f) => places.get(f.placeId))
    .filter((p): p is PlaceSummary => p !== undefined);
  const mapArea = circleAround(
    visiblePlaces.map((p) => p.location),
    userLocation ?? DEFAULT_LOCATION,
  );
  const countIn = (id: string) => all.filter((f) => f.listIds.includes(id)).length;

  const header = (
    <View style={styles.titleRow}>
      <ThemedText type="title" accessibilityRole="header">
        Favoriten
      </ThemedText>
      <Pressable
        onPress={() => router.push('/favorites-manage')}
        accessibilityRole="button"
        accessibilityLabel="Listen und Sicherung verwalten"
        hitSlop={8}>
        <ThemedText type="link">Verwalten</ThemedText>
      </Pressable>
    </View>
  );

  if (all.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
        {header}
        <StateMessage
          icon="heart"
          title="Noch keine Favoriten"
          message="Tippe bei einem Lokal auf das Herz, um es hier zu sammeln – mit eigenen Listen, Notizen und Bewertung."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      {header}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
        accessibilityLabel="Listen">
        <Chip
          label={`Alle (${all.length})`}
          selected={activeListId === null}
          onPress={() => setListId(null)}
        />
        {lists.map((l) => (
          <Chip
            key={l.id}
            label={`${l.name} (${countIn(l.id)})`}
            selected={activeListId === l.id}
            onPress={() => setListId(l.id)}
          />
        ))}
        <Chip
          label="Neue Liste"
          onPress={() => router.push('/favorites-manage')}
          icon={<Icon name="plus" size={14} color={theme.text} />}
        />
      </ScrollView>

      <View style={styles.controls}>
        <Pressable
          onPress={() => setShowSort((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Sortierung: ${SORT_LABEL[sort]}. Ändern`}
          accessibilityState={{ expanded: showSort }}
          style={styles.sortButton}
          hitSlop={8}>
          <Icon name="sort" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {SORT_LABEL[sort]}
          </ThemedText>
        </Pressable>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}>
        {showSort
          ? SORTS.map((s) => (
              <Chip
                key={s}
                label={SORT_LABEL[s]}
                selected={sort === s}
                onPress={() => {
                  setSort(s);
                  setShowSort(false);
                }}
              />
            ))
          : VISITS.map((v) => (
              <Chip
                key={v}
                label={VISIT_LABEL[v]}
                selected={visit === v}
                onPress={() => setVisit(v)}
              />
            ))}
      </ScrollView>
      {sort === 'distance' && !userLocation && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Für die Sortierung nach Entfernung wird dein Standort benötigt.
        </ThemedText>
      )}

      <View style={styles.content}>
        {viewMode === 'map' ? (
          <ResultsMap
            places={visiblePlaces}
            center={mapArea.center}
            radiusMeters={mapArea.radiusMeters}
            userLocation={userLocation}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(f) => f.placeId}
            renderItem={({ item }) => (
              <FavoriteCard
                favorite={item}
                entry={get(item.placeId)}
                lists={lists}
                userLocation={userLocation}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.list}
            onRefresh={reload}
            refreshing={false}
            ListEmptyComponent={
              <StateMessage
                icon="empty"
                title="Keine Favoriten in dieser Ansicht"
                message="Wähle eine andere Liste oder einen anderen Filter."
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 1 },
  hint: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  content: { flex: 1, marginTop: Spacing.three },
  list: { padding: Spacing.three, paddingTop: 0, paddingBottom: Spacing.six, flexGrow: 1 },
  separator: { height: Spacing.three },
});
