import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScreenPlaceholder title="Details" description={`Ort ${id} – folgt in Phase 5.`} />;
}
