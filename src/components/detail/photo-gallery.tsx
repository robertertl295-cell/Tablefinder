import { useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { PlacePhoto } from '@/components/place/place-photo';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { PhotoRef } from '@/types/place';

const HEIGHT = 300;

/** Wischbare Fotos in voller Breite, mit Zähler. Bilder laden erst beim Anzeigen. */
export function PhotoGallery({ photos }: { photos: PhotoRef[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (photos.length <= 1) {
    return <PlacePhoto photo={photos[0] ?? null} width={width} style={{ height: HEIGHT }} />;
  }

  return (
    <View accessibilityLabel={`Fotogalerie, ${photos.length} Fotos`}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.name}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialNumToRender={1}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <PlacePhoto photo={item} width={width} style={{ width, height: HEIGHT }} />
        )}
      />
      <View style={styles.counter} accessible={false} importantForAccessibility="no">
        <ThemedText style={styles.counterText}>
          {index + 1} / {photos.length}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  counterText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: 600 },
});
