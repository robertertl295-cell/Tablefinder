import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { FilterSection, MultiChoice, SingleChoice } from '@/components/filters/filter-section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABEL } from '@/services/places/place-types';
import { filterStore } from '@/store/filter-store';
import type { Filters } from '@/types/filters';
import {
  ATTRIBUTE_LABEL,
  ATTRIBUTE_OPTIONS,
  CATEGORY_OPTIONS,
  createDefaultFilters,
  MEAL_LABEL,
  MEAL_OPTIONS,
  PRICE_OPTIONS,
  RADIUS_OPTIONS,
  RATING_COUNT_OPTIONS,
  RATING_OPTIONS,
  toggle,
} from '@/utils/filters';
import {
  formatCount,
  formatDistance,
  formatPriceLevel,
  formatRating,
  PRICE_LEVEL_LABEL,
} from '@/utils/format';
import { LOW_DATA_THRESHOLD } from '@/utils/rating';

/**
 * Filter als Bottom Sheet. Änderungen werden erst beim Schließen übernommen
 * (egal ob per „Fertig“ oder Wischgeste) – so löst nicht jeder Tipp eine Anfrage aus.
 */
export default function FiltersSheet() {
  const theme = useTheme();
  const [draft, setDraft] = useState<Filters>(() => filterStore.getState().filters);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const ref = draftRef;
    return () => filterStore.getState().setFilters(ref.current);
  }, []);

  const update = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.bar, { borderColor: theme.border }]}>
        <Pressable
          onPress={() => setDraft(createDefaultFilters())}
          accessibilityRole="button"
          accessibilityLabel="Alle Filter zurücksetzen"
          hitSlop={8}>
          <ThemedText type="link">Zurücksetzen</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" accessibilityRole="header" style={styles.title}>
          Filter
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Filter anwenden und schließen"
          hitSlop={8}>
          <ThemedText type="link" style={styles.done}>
            Fertig
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FilterSection title="Art">
          <MultiChoice
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            values={draft.categories}
            onToggle={(c) => update({ categories: toggle(draft.categories, c) })}
          />
        </FilterSection>

        <View style={styles.switchRow}>
          <ThemedText type="smallBold">Jetzt geöffnet</ThemedText>
          <Switch
            value={draft.openNow}
            onValueChange={(openNow) => update({ openNow })}
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
            accessibilityLabel="Nur jetzt geöffnete Lokale"
          />
        </View>

        <FilterSection title="Mindestbewertung">
          <SingleChoice
            options={RATING_OPTIONS.map((r) => ({
              value: r,
              label: `${formatRating(r)} ★`,
              accessibilityLabel: `ab ${formatRating(r)} Sternen`,
            }))}
            value={draft.minRating}
            onChange={(minRating) => update({ minRating })}
          />
        </FilterSection>

        <FilterSection
          title="Mindestanzahl Bewertungen"
          hint={`Unter ${LOW_DATA_THRESHOLD} Bewertungen ist die Datenbasis dünn – einzelne Stimmen verzerren den Schnitt stark.`}>
          <SingleChoice
            options={RATING_COUNT_OPTIONS.map((n) => ({
              value: n,
              label: `${formatCount(n)}+`,
              accessibilityLabel: `mindestens ${formatCount(n)} Bewertungen`,
            }))}
            value={draft.minRatingCount}
            onChange={(minRatingCount) => update({ minRatingCount })}
          />
        </FilterSection>

        <FilterSection title="Preisniveau">
          <MultiChoice
            options={PRICE_OPTIONS.map((p) => ({
              value: p,
              label: formatPriceLevel(p),
              accessibilityLabel: `Preisniveau ${PRICE_LEVEL_LABEL[p]}`,
            }))}
            values={draft.priceLevels}
            onToggle={(p) => update({ priceLevels: toggle(draft.priceLevels, p) })}
          />
        </FilterSection>

        <FilterSection title="Umkreis">
          <MultiChoice
            options={RADIUS_OPTIONS.map((r) => ({ value: r, label: formatDistance(r) }))}
            values={[draft.radiusMeters]}
            onToggle={(radiusMeters) => update({ radiusMeters })}
          />
        </FilterSection>

        <FilterSection
          title="Angebot"
          hint="Zeigt nur Lokale, bei denen die Angabe ausdrücklich vorliegt.">
          <MultiChoice
            options={ATTRIBUTE_OPTIONS.map((a) => ({ value: a, label: ATTRIBUTE_LABEL[a] }))}
            values={draft.attributes}
            onToggle={(a) => update({ attributes: toggle(draft.attributes, a) })}
          />
        </FilterSection>

        <FilterSection title="Mahlzeit">
          <MultiChoice
            options={MEAL_OPTIONS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
            values={draft.meals}
            onToggle={(m) => update({ meals: toggle(draft.meals, m) })}
          />
        </FilterSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17 },
  done: { fontWeight: 700 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.four },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
