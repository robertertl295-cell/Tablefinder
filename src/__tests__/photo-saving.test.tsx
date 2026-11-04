import { act, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/place/place-card';
import { placesProvider } from '@/services/places';
import { MOCK_PLACES } from '@/services/places/mock-data';
import { sanitizeSettings, settingsStore } from '@/store/settings-store';
import type { PlaceSummary } from '@/types/place';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/places', () => ({
  placesProvider: {
    source: 'google',
    getPhotoUrl: jest.fn(() => 'https://example.invalid/photo.jpg'),
  },
}));

const GOOGLE_PLACE: PlaceSummary = {
  ...MOCK_PLACES[0]!,
  id: 'ChIJ-test',
  source: 'google',
  photo: { name: 'places/ChIJ-test/photos/abc', widthPx: 800, heightPx: 600, attributions: [] },
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderCard = (place: PlaceSummary) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PlaceCard place={place} distanceMeters={null} onPress={jest.fn()} />
    </SafeAreaProvider>,
  );

const getPhotoUrl = placesProvider.getPhotoUrl as jest.Mock;

beforeEach(async () => {
  getPhotoUrl.mockClear();
  await act(async () => settingsStore.getState().reset());
});

describe('Foto-Sparmodus', () => {
  it('ist Standard und lädt in der Liste keine Google-Fotos', async () => {
    expect(settingsStore.getState().listPhotos).toBe('symbol');
    await renderCard(GOOGLE_PLACE);
    expect(getPhotoUrl).not.toHaveBeenCalled();
  });

  it('mit „Echte Fotos“ lädt die Liste das Google-Foto', async () => {
    await act(async () => settingsStore.getState().setListPhotos('real'));
    await renderCard(GOOGLE_PLACE);
    expect(getPhotoUrl).toHaveBeenCalledWith(GOOGLE_PLACE.photo, expect.any(Number));
  });

  it('kostenlose Beispielfotos werden auch im Sparmodus gezeigt', async () => {
    await renderCard({ ...GOOGLE_PLACE, source: 'mock', photo: MOCK_PLACES[0]!.photo });
    expect(getPhotoUrl).toHaveBeenCalled();
  });

  it('ungültige gespeicherte Werte fallen auf den Sparmodus zurück', () => {
    expect(sanitizeSettings({ listPhotos: 'alles' }).listPhotos).toBe('symbol');
    expect(sanitizeSettings({ listPhotos: 'real' }).listPhotos).toBe('real');
  });
});
