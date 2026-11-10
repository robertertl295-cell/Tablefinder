import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FavoriteButton } from '@/components/favorites/favorite-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings, useUnits } from '@/store/settings-store';
import type { PlaceSummary } from '@/types/place';
import { formatDistance, formatPriceLevel, formatRating } from '@/utils/format';
import { placeAccessibilityLabel, placeStatus, type StatusTone } from '@/utils/place-labels';
import { describeOpenState } from '@/utils/opening-hours';
import { trustScore } from '@/utils/trust-score';
import { formatWalkingTime, spokenWalkingTime } from '@/utils/walking';

import { placeholderFor } from '@/services/placeholders/placeholders';

import { PlacePhoto } from './place-photo';
import { RatingLine } from './rating-line';

type Props = {
  place: PlaceSummary;
  distanceMeters: number | null;
  onPress: () => void;
  /** Kompakte Variante (Foto links) für die Kartenansicht. */
  compact?: boolean;
  /** Ohne Rahmen (wenn die Karte in einem anderen Rahmen steckt). */
  flat?: boolean;
  /** Herz zum Merken anzeigen (Standard: ja). */
  showFavorite?: boolean;
  /** Vertrauensscore anzeigen (wenn danach sortiert wird). */
  showTrustScore?: boolean;
};

export function PlaceCard({
  place,
  distanceMeters,
  onPress,
  compact = false,
  flat = false,
  showFavorite = true,
  showTrustScore = false,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const units = useUnits();
  const status = placeStatus(place.openNow, place.businessStatus);
  const toneColor: Record<StatusTone, string> = {
    success: theme.success,
    neutral: theme.textSecondary,
    warning: theme.warning,
    danger: theme.danger,
  };
  const meta = [
    place.typeLabel,
    place.priceLevel !== null ? formatPriceLevel(place.priceLevel) : null,
    distanceMeters !== null
      ? compact
        ? `${formatDistance(distanceMeters, units)} · ${formatWalkingTime(distanceMeters)}`
        : formatDistance(distanceMeters, units)
      : null,
  ].filter(Boolean);
  const badges = compact ? [] : cardBadges(place, distanceMeters, new Date());
  const isClosed = place.businessStatus === 'closed_permanently';
  const { photo, placeholder, savePhoto } = useCardImage(place);
  const score = showTrustScore ? trustScore(place.rating, place.ratingCount) : null;

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          placeAccessibilityLabel(place, distanceMeters, units) +
          (distanceMeters !== null ? `, ${spokenWalkingTime(distanceMeters)}` : '') +
          (score !== null ? `, Vertrauensscore ${formatRating(score)}` : '')
        }
        accessibilityHint="Öffnet die Details"
        style={({ pressed }) => [
          styles.card,
          compact && styles.compact,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        {/* Ohne Foto (OSM, Sparmodus): KI-Symbolbild, sonst keine leere Fläche. */}
        {(photo || placeholder || (place.source !== 'osm' && !savePhoto)) && (
          <View>
            <PlacePhoto
              photo={photo}
              placeholder={placeholder}
              width={compact ? 96 : width}
              style={[compact ? styles.photoCompact : styles.photo, isClosed && styles.dimmed]}
            />
            {badges.length > 0 && (
              <View style={styles.badges} accessible={false} importantForAccessibility="no">
                {badges.map((b) => (
                  <View key={b} style={styles.badge}>
                    <ThemedText style={styles.badgeText}>{b}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        <View style={[styles.body, compact && styles.bodyCompact]}>
          <ThemedText type="subtitle" numberOfLines={1} style={compact && styles.nameCompact}>
            {place.name}
          </ThemedText>
          {meta.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {meta.join(' · ')}
            </ThemedText>
          )}
          <RatingLine rating={place.rating} ratingCount={place.ratingCount} source={place.source} />
          {score !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              Vertrauensscore{' '}
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {formatRating(score)}
              </ThemedText>
            </ThemedText>
          )}
          {status && (
            <ThemedText type="smallBold" style={{ color: toneColor[status.tone] }}>
              {status.label}
            </ThemedText>
          )}
        </View>
      </Pressable>
      {showFavorite && (
        <View style={compact ? styles.heartCompact : styles.heart}>
          <FavoriteButton
            placeId={place.id}
            placeName={place.name}
            variant={compact ? 'plain' : 'overlay'}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compact: { flexDirection: 'row', borderRadius: Radius.medium },
  flat: { borderWidth: 0, borderRadius: 0 },
  heart: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  heartCompact: { position: 'absolute', top: Spacing.two + Spacing.one, right: Spacing.three },
  photo: { height: 196 },
  badges: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: 64, // Platz für das Herz
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
  },
  badgeText: { color: '#1C1917', fontSize: 13, lineHeight: 17, fontWeight: 700 },
  photoCompact: { width: 96, alignSelf: 'stretch', minHeight: 104 },
  dimmed: { opacity: 0.4 },
  body: { padding: Spacing.three, gap: Spacing.one },
  // Platz rechts für das Herz.
  bodyCompact: { flex: 1, padding: Spacing.two + Spacing.one, paddingRight: Spacing.six },
  nameCompact: { fontSize: 17, lineHeight: 22 },
});

/**
 * Kurzinfos auf dem Bild (wie bei Lieferdiensten): Gehzeit, „bis 23:00“, ein Merkmal.
 * Höchstens drei, damit das Bild sichtbar bleibt. Bewertung steht darunter im Text.
 */
export function cardBadges(
  place: PlaceSummary,
  distanceMeters: number | null,
  now: Date,
): string[] {
  const badges: string[] = [];
  if (distanceMeters !== null) badges.push(`🚶 ${formatWalkingTime(distanceMeters)}`);
  const state = place.periods ? describeOpenState(place.periods, now) : null;
  if (state?.open && state.detail) {
    if (state.detail.startsWith('Schließt um ')) {
      badges.push(`bis ${state.detail.slice('Schließt um '.length)}`);
    } else if (state.detail === 'Durchgehend geöffnet') {
      badges.push('24 h');
    }
  }
  if (place.attributes.vegan) badges.push('Vegan');
  else if (place.attributes.outdoorSeating) badges.push('Terrasse');
  return badges;
}

/**
 * Bild für Karten in Listen: Foto-Sparmodus (Google-Fotos kosten pro Anzeige → Symbolbild),
 * sonst Foto, ohne Foto das KI-Symbolbild.
 */
export function useCardImage(place: PlaceSummary) {
  const listPhotos = useSettings((s) => s.listPhotos);
  const savePhoto = listPhotos === 'symbol' && place.source === 'google';
  const photo = savePhoto ? null : place.photo;
  const placeholder = photo ? null : placeholderFor(place);
  return { photo, placeholder, savePhoto };
}
