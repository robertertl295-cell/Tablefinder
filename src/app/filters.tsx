import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { FilterSection, MultiChoice, SingleChoice } from '@/components/filters/filter-section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABEL } from '@/services/places/place-types';
import { filterStore } from '@/store/filter-store';
import { useActiveSource, useSourceCapabilities } from '@/hooks/use-active-source';
import { SOURCE_LABEL } from '@/services/places/capabilities';
import { settingsStore, useSettings, useUnits } from '@/store/settings-store';
import type { AttributeKey, Filters } from '@/types/filters';
import {
  AMENITY_OPTIONS,
  ATTRIBUTE_LABEL,
  CATEGORY_OPTIONS,
  createDefaultFilters,
  CUISINE_GROUPS,
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  HOURS_LABEL,
  HOURS_OPTIONS,
  MEAL_LABEL,
  MEAL_OPTIONS,
  PRICE_OPTIONS,
  RADIUS_OPTIONS,
  RATING_COUNT_OPTIONS,
  RATING_OPTIONS,
  SERVICE_OPTIONS,
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
import { availableSorts, effectiveSort, RESULT_SORT_LABEL } from '@/utils/sort-places';

/**
 * Filter als Bottom Sheet. Änderungen werden erst beim Schließen übernommen
 * (egal ob per „Fertig“ oder Wischgeste) – so löst nicht jeder Tipp eine Anfrage aus.
 */
export default function FiltersSheet() {
  const theme = useTheme();
  const units = useUnits();
  const caps = useSourceCapabilities();
  const source = useActiveSource();
  const resultSort = effectiveSort(
    useSettings((s) => s.resultSort),
    caps,
  );
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

  /** Merkmal-Gruppe mit nur den Optionen, die die aktive Quelle liefert. */
  const attributeSection = (title: string, options: readonly AttributeKey[], hint?: string) => {
    const supported = options.filter((a) => caps.attributes.includes(a));
    if (supported.length === 0) return null;
    return (
      <FilterSection title={title} hint={hint}>
        <MultiChoice
          options={supported.map((a) => ({ value: a, label: ATTRIBUTE_LABEL[a] }))}
          values={draft.attributes}
          onToggle={(a) => update({ attributes: toggle(draft.attributes, a) })}
        />
      </FilterSection>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.bar, { borderColor: theme.border }]}>
        <Pressable
          onPress={() =>
            setDraft(createDefaultFilters(settingsStore.getState().defaultRadiusMeters))
          }
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
        {!caps.ratings && (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={[styles.sourceNote, { backgroundColor: theme.backgroundElement }]}>
            Datenquelle {SOURCE_LABEL[source]}: Bewertungen und Preise gibt es dort nicht, die
            passenden Filter sind ausgeblendet. Deine Auswahl dafür bleibt gespeichert.
          </ThemedText>
        )}

        <FilterSection
          title="Sortieren nach"
          hint={
            caps.ratings
              ? 'Der Vertrauensscore berücksichtigt, wie viele Bewertungen hinter dem Schnitt stehen.'
              : undefined
          }>
          <MultiChoice
            options={availableSorts(caps).map((s) => ({ value: s, label: RESULT_SORT_LABEL[s] }))}
            values={[resultSort]}
            onToggle={(s) => settingsStore.getState().setResultSort(s)}
          />
        </FilterSection>

        <FilterSection title="Art">
          <MultiChoice
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            values={draft.categories}
            onToggle={(c) => update({ categories: toggle(draft.categories, c) })}
          />
        </FilterSection>

        <FilterSection title="Küche">
          <MultiChoice
            options={CUISINE_OPTIONS.map((c) => ({ value: c, label: CUISINE_GROUPS[c].label }))}
            values={draft.cuisines}
            onToggle={(c) => update({ cuisines: toggle(draft.cuisines, c) })}
          />
        </FilterSection>

        <FilterSection title="Öffnungszeiten">
          <View style={styles.switchRow}>
            <ThemedText>Jetzt geöffnet</ThemedText>
            <Switch
              value={draft.openNow}
              onValueChange={(openNow) => update({ openNow })}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Nur jetzt geöffnete Lokale"
            />
          </View>
          <MultiChoice
            options={HOURS_OPTIONS.map((h) => ({ value: h, label: HOURS_LABEL[h] }))}
            values={draft.hours}
            onToggle={(h) => update({ hours: toggle(draft.hours, h) })}
          />
        </FilterSection>

        {caps.ratings && (
          <>
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
          </>
        )}

        {caps.priceLevels && (
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
        )}

        <FilterSection title="Umkreis">
          <MultiChoice
            options={RADIUS_OPTIONS.map((r) => ({ value: r, label: formatDistance(r, units) }))}
            values={[draft.radiusMeters]}
            onToggle={(radiusMeters) => update({ radiusMeters })}
          />
        </FilterSection>

        {attributeSection('Ernährung', DIET_OPTIONS)}
        {attributeSection('Ausstattung', AMENITY_OPTIONS)}
        {attributeSection(
          'Service',
          SERVICE_OPTIONS,
          'Bei Ernährung, Ausstattung und Service zählen nur ausdrückliche Angaben – Lokale ohne Angabe werden nicht angezeigt.',
        )}

        {caps.meals && (
          <FilterSection title="Mahlzeit">
            <MultiChoice
              options={MEAL_OPTIONS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
              values={draft.meals}
              onToggle={(m) => update({ meals: toggle(draft.meals, m) })}
            />
          </FilterSection>
        )}
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
  sourceNote: { padding: Spacing.three, borderRadius: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
