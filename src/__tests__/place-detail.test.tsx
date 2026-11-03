import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PlaceDetailScreen from '@/app/place/[id]';

let mockId = 'mock-ramen-kreuzberg';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  return { ...actual, placesProvider: new MockPlacesProvider({ latencyMs: 0 }) };
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderDetail = (id: string) => {
  mockId = id;
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PlaceDetailScreen />
    </SafeAreaProvider>,
  );
};

describe('Detailseite', () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  afterEach(() => openURL.mockClear());

  it('zeigt alle Abschnitte mit Daten aus dem Anbieter', async () => {
    await renderDetail('mock-ramen-kreuzberg');
    expect(await screen.findByText('Nudelwerk Ramen')).toBeOnTheScreen();
    expect(screen.getByText('Ramen-Restaurant · €€')).toBeOnTheScreen();

    // Bewertung mit Datenbasis
    expect(screen.getByText('1.284 Bewertungen')).toBeOnTheScreen();
    expect(screen.getByText('Breite Datenbasis')).toBeOnTheScreen();

    // Öffnungszeiten: genau ein Tag ist „heute“
    expect(screen.getAllByText(/\(heute\)/)).toHaveLength(1);

    // Angebot: bekannte Merkmale, fehlende weggelassen
    expect(screen.getByLabelText('Vegetarisch: ja')).toBeOnTheScreen();
    expect(screen.getByLabelText('Gut für Gruppen: nein')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Hundefreundlich/)).toBeNull();

    // Rezensionen mit Quellenangabe
    expect(screen.getByText('Beispielrezensionen (Mock-Daten)')).toBeOnTheScreen();
    expect(screen.getByText('Mara K.')).toBeOnTheScreen();
    expect(screen.getByText('Beispieldaten – kein API-Schlüssel hinterlegt')).toBeOnTheScreen();
  });

  it('öffnet Route und Telefon über die System-Apps', async () => {
    await renderDetail('mock-ramen-kreuzberg');
    await fireEvent.press(await screen.findByLabelText('Route'));
    expect(openURL).toHaveBeenCalledWith(
      Platform.OS === 'ios'
        ? 'https://maps.apple.com/?daddr=52.5009,13.4186&q=Nudelwerk%20Ramen'
        : expect.stringContaining('52.5009,13.4186'),
    );
    await fireEvent.press(screen.getByLabelText('Anrufen'));
    expect(openURL).toHaveBeenLastCalledWith('tel:+4930' + '12345601');
  });

  it('weist auf wenig Datenbasis und fehlende Angaben hin', async () => {
    await renderDetail('mock-vegan-kreuzberg');
    expect(await screen.findByText('Wenig Datenbasis')).toBeOnTheScreen();
    // keine Telefonnummer → kein Anruf-Button
    expect(screen.queryByLabelText('Anrufen')).toBeNull();
  });

  it('markiert dauerhaft geschlossene Lokale deutlich', async () => {
    await renderDetail('mock-closed-moabit');
    expect(
      await screen.findByText('Dieses Lokal ist laut Google dauerhaft geschlossen.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Keine Öffnungszeiten angegeben.')).toBeOnTheScreen();
  });

  it('zeigt einen Fehler für unbekannte Orte', async () => {
    await renderDetail('gibt-es-nicht');
    expect(await screen.findByText('Ort nicht gefunden')).toBeOnTheScreen();
    expect(screen.getByLabelText('Zurück')).toBeOnTheScreen();
  });
});
