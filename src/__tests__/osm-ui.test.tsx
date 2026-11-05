import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SettingsScreen from '@/app/(tabs)/settings';
import FiltersSheet from '@/app/filters';
import PlaceDetailScreen from '@/app/place/[id]';
import { PlaceCard } from '@/components/place/place-card';
import { mapOsmElement } from '@/services/places/osm-mapping';
import { settingsStore } from '@/store/settings-store';
import type { DataSource } from '@/types/place';

import { OSM_RAMEN } from './fixtures/overpass';

let mockSource: DataSource = 'osm';
const OSM_PLACE = mapOsmElement(OSM_RAMEN)!;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'osm:node:101' }),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/services/favorites-file', () => ({ deleteBackupFiles: jest.fn() }));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { mapOsmElement: map } = jest.requireActual('@/services/places/osm-mapping');
  const { OSM_RAMEN: ramen } = jest.requireActual('./fixtures/overpass');
  return {
    ...actual,
    placesProvider: {
      get source() {
        return mockSource;
      },
      search: jest.fn(async () => ({ places: [], nextPageToken: null })),
      getDetails: jest.fn(async () => map(ramen)),
      getSummary: jest.fn(async () => map(ramen)),
      getPhotoUrl: () => null,
      clear: jest.fn(),
    },
  };
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>
);

beforeEach(async () => {
  mockSource = 'osm';
  jest.restoreAllMocks();
  await act(async () => settingsStore.getState().reset());
});

describe('OSM-Orte in der Oberfläche', () => {
  it('Ergebniskarte: kein leerer Fotobereich, ehrlicher Hinweis statt Sternen', async () => {
    await render(wrap(<PlaceCard place={OSM_PLACE} distanceMeters={null} onPress={jest.fn()} />));
    expect(screen.getByText('Keine Bewertungen (OpenStreetMap)')).toBeOnTheScreen();
    expect(screen.getByText('Restaurant · Ramen, Japanisch')).toBeOnTheScreen();
    expect(screen.queryByText(/^Foto/)).toBeNull();
    expect(screen.getByLabelText(/keine Bewertungen in OpenStreetMap/)).toBeOnTheScreen();
  });

  it('Detailseite: Hinweis, Link zu OSM und Lizenzangabe', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(wrap(<PlaceDetailScreen />));
    expect(await screen.findByText('Ramen Yokai')).toBeOnTheScreen();
    expect(screen.getByText(/OpenStreetMap enthält keine Bewertungen/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Vegan: ja')).toBeOnTheScreen();
    expect(screen.queryByText('Neueste Rezensionen')).toBeNull();

    await fireEvent.press(screen.getByText('Auf OpenStreetMap ansehen'));
    expect(openURL).toHaveBeenCalledWith('https://www.openstreetmap.org/node/101');
    await fireEvent.press(
      screen.getByLabelText('Daten von OpenStreetMap-Mitwirkenden, Lizenz ODbL'),
    );
    expect(openURL).toHaveBeenLastCalledWith('https://www.openstreetmap.org/copyright');
  });
});

describe('Filter-Sheet je Quelle', () => {
  it('OSM: Bewertung, Preis, Mahlzeit und Vertrauensscore ausgeblendet, Vegan sichtbar', async () => {
    await render(wrap(<FiltersSheet />));
    expect(screen.getByText(/Bewertungen und Preise gibt es dort nicht/)).toBeOnTheScreen();
    expect(screen.queryByText('Mindestbewertung')).toBeNull();
    expect(screen.queryByText('Preisniveau')).toBeNull();
    expect(screen.queryByText('Mahlzeit')).toBeNull();
    expect(screen.queryByLabelText('Vertrauensscore')).toBeNull();
    expect(screen.queryByLabelText('Gut für Gruppen')).toBeNull();
    expect(screen.getByLabelText('Vegan')).toBeOnTheScreen();
  });

  it('Google: alle Filter, aber kein Vegan', async () => {
    mockSource = 'google';
    await render(wrap(<FiltersSheet />));
    expect(screen.getByText('Mindestbewertung')).toBeOnTheScreen();
    expect(screen.getByLabelText('Vertrauensscore')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Vegan')).toBeNull();
  });
});

describe('Einstellungen: Datenquelle', () => {
  it('wählt OpenStreetMap; Google ohne Schlüssel erklärt, warum es nicht geht', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(wrap(<SettingsScreen />));
    expect(screen.getByText('Aktiv: OpenStreetMap')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Beispieldaten'));
    expect(settingsStore.getState().dataSource).toBe('mock');

    await fireEvent.press(screen.getByLabelText('Nur Google'));
    expect(alert).toHaveBeenCalledWith('Kein API-Schlüssel', expect.stringContaining('.env'));
    expect(settingsStore.getState().dataSource).toBe('mock');

    await fireEvent.press(screen.getByLabelText('Google + OSM'));
    expect(alert).toHaveBeenCalledTimes(2);
    expect(settingsStore.getState().dataSource).toBe('mock');

    await fireEvent.press(screen.getByLabelText('OpenStreetMap'));
    expect(settingsStore.getState().dataSource).toBe('osm');
  });
});
