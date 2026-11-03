import { Image } from 'expo-image';
import { PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { placesProvider } from '@/services/places';
import type { PhotoRef } from '@/types/place';

type Props = {
  photo: PhotoRef | null;
  /** Darstellungsbreite in Punkten; bestimmt die angefragte Bildgröße. */
  width: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lädt ein Ortsfoto erst, wenn es gerendert wird (Listen virtualisieren).
 * Google-Fotos nur im Arbeitsspeicher cachen – dauerhaftes Speichern ist nicht erlaubt.
 */
export function PlacePhoto({ photo, width, style }: Props) {
  const theme = useTheme();
  const uri = photo
    ? placesProvider.getPhotoUrl(photo, PixelRatio.getPixelSizeForLayoutSize(width))
    : null;
  const author = photo?.attributions[0]?.displayName;

  return (
    <View style={[styles.frame, { backgroundColor: theme.backgroundSelected }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy={placesProvider.source === 'google' ? 'memory' : 'memory-disk'}
          recyclingKey={photo?.name}
          accessible={false}
        />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="photo" size={28} color={theme.textSecondary} />
        </View>
      )}
      {uri && author ? (
        <View style={styles.attribution} accessible={false} importantForAccessibility="no">
          <ThemedText style={styles.attributionText} numberOfLines={1}>
            Foto: {author}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  attribution: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    maxWidth: '70%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 4,
  },
  attributionText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14 },
});
