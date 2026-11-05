import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FavoritesScreen from '@/app/(tabs)/favorites';
import FavoritesManageSheet from '@/app/favorites-manage';
import PlaceDetailScreen from '@/app/place/[id]';
import { PlaceCard } from '@/components/place/place-card';
import { MOCK_PLACES } from '@/services/places/mock-data';
import { favoritesStore } from '@/store/favorites-store';
import { createBackup } from '@/utils/favorites';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockId = 'mock-ramen-kreuzberg';
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({ id: mockId }),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('@/services/places', () => {
  const actual = jest.requireActual('@/services/places');
  const { MockPlacesProvider } = jest.requireActual('@/services/places/mock-provider');
  return { ...actual, placesProvider: new MockPlacesProvider({ latencyMs: 0 }) };
});
const mockShare = jest.fn(async (_backup: unknown) => 'shared' as const);
const mockPick = jest.fn();
jest.mock('@/services/favorites-file', () => ({
  shareBackup: (b: unknown) => mockShare(b),
  pickBackup: () => mockPick(),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>
);
const place = (id: string) => MOCK_PLACES.find((p) => p.id === id)!;

/** Alert-Dialoge im Test: drückt automatisch den Button mit dem gegebenen Text. */
function answerAlerts(buttonText: string | null) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: AlertButton[]) => {
    if (buttonText) buttons?.find((b) => b.text === buttonText)?.onPress?.();
  });
}

beforeEach(async () => {
  await act(async () => favoritesStore.getState().clearAll());
  jest.restoreAllMocks();
  mockPush.mockClear();
});

describe('Herz-Button', () => {
  it('merkt einen Ort und fragt beim Entfernen nach, wenn eigene Angaben existieren', async () => {
    await render(
      wrap(
        <PlaceCard place={place('mock-cafe-mitte')} distanceMeters={null} onPress={jest.fn()} />,
      ),
    );
    await fireEvent.press(screen.getByLabelText('Café Morgenlicht zu Favoriten hinzufügen'));
    expect(favoritesStore.getState().favorites['mock-cafe-mitte']).toBeDefined();

    await act(async () =>
      favoritesStore.getState().updateFavorite('mock-cafe-mitte', { ownRating: 5 }),
    );
    const alert = answerAlerts('Abbrechen');
    await fireEvent.press(screen.getByLabelText('Café Morgenlicht aus Favoriten entfernen'));
    expect(alert).toHaveBeenCalled();
    expect(favoritesStore.getState().favorites['mock-cafe-mitte']).toBeDefined();

    answerAlerts('Entfernen');
    await fireEvent.press(screen.getByLabelText('Café Morgenlicht aus Favoriten entfernen'));
    expect(favoritesStore.getState().favorites['mock-cafe-mitte']).toBeUndefined();
  });
});

describe('Detailseite: Meine Notizen', () => {
  it('bearbeitet Besuchsstatus, eigene Bewertung, Listen und Notiz', async () => {
    const listId = favoritesStore.getState().createList('Date-Abend')!;
    mockId = 'mock-ramen-kreuzberg';
    await render(wrap(<PlaceDetailScreen />));

    await fireEvent.press(await screen.findByText('Zu Favoriten hinzufügen'));
    expect(favoritesStore.getState().favorites[mockId]).toBeDefined();

    await fireEvent(screen.getByLabelText('Schon besucht'), 'valueChange', true);
    await fireEvent.press(screen.getByLabelText('4 Sterne'));
    await fireEvent.press(screen.getByLabelText('Date-Abend'));
    await fireEvent.changeText(screen.getByLabelText('Notiz'), 'Fensterplatz!');

    await waitFor(() =>
      expect(favoritesStore.getState().favorites[mockId]).toMatchObject({
        visited: true,
        ownRating: 4,
        listIds: [listId],
        note: 'Fensterplatz!',
      }),
    );
  });
});

describe('Favoriten-Tab', () => {
  it('zeigt den Leerzustand', async () => {
    await render(wrap(<FavoritesScreen />));
    expect(screen.getByText('Noch keine Favoriten')).toBeOnTheScreen();
  });

  it('lädt frische Ortsdaten, markiert Geschlossenes und filtert nach Liste', async () => {
    const s = favoritesStore.getState();
    const uni = s.createList('Mittagessen Uni')!;
    s.addFavorite('mock-lunch-mitte', [uni]);
    s.addFavorite('mock-closed-moabit');
    s.addFavorite('gibt-es-nicht-mehr');
    s.updateFavorite('mock-lunch-mitte', { visited: true, note: 'Montags Suppe' });

    await render(wrap(<FavoritesScreen />));
    expect(await screen.findByText('Mittagstisch Spree')).toBeOnTheScreen();
    expect(screen.getByText('„Montags Suppe“')).toBeOnTheScreen();
    expect(screen.getByText('✓ Besucht')).toBeOnTheScreen();
    expect(await screen.findAllByText('Dauerhaft geschlossen')).not.toHaveLength(0);
    expect(await screen.findByText('Ort nicht mehr verfügbar')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Mittagessen Uni (1)'));
    expect(screen.getByText('Mittagstisch Spree')).toBeOnTheScreen();
    expect(screen.queryByText('Zum Alten Fass')).toBeNull();

    // Nicht mehr verfügbaren Ort entfernen
    await fireEvent.press(screen.getByLabelText('Alle (3)'));
    await fireEvent.press(screen.getByText('Aus Favoriten entfernen'));
    expect(favoritesStore.getState().favorites['gibt-es-nicht-mehr']).toBeUndefined();
  });
});

describe('Verwalten-Sheet', () => {
  it('hat oben „Fertig“ und führt zurück zu den Favoriten', async () => {
    await render(wrap(<FavoritesManageSheet />));
    await fireEvent.press(screen.getByLabelText('Fertig, zurück zu den Favoriten'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('legt Listen an, löscht sie und exportiert', async () => {
    await render(wrap(<FavoritesManageSheet />));
    await fireEvent.press(screen.getByLabelText('Liste „Date-Abend“ anlegen'));
    await fireEvent.changeText(screen.getByLabelText('Name der neuen Liste'), 'Brunch');
    await fireEvent.press(screen.getByLabelText('Liste anlegen'));
    expect(favoritesStore.getState().lists.map((l) => l.name)).toEqual(['Date-Abend', 'Brunch']);

    answerAlerts('Löschen');
    await fireEvent.press(screen.getByLabelText('Liste Brunch löschen'));
    expect(favoritesStore.getState().lists.map((l) => l.name)).toEqual(['Date-Abend']);

    await fireEvent.press(screen.getByText('Exportieren'));
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'tablefinder',
        lists: [expect.objectContaining({ name: 'Date-Abend' })],
      }),
    );
  });

  it('importiert eine Sicherung per Zusammenführen', async () => {
    favoritesStore.getState().addFavorite('mine');
    const backup = createBackup(
      [{ id: 'l1', name: 'Brunch', createdAt: '2026-01-01T00:00:00Z' }],
      [
        {
          placeId: 'theirs',
          listIds: ['l1'],
          note: 'aus Sicherung',
          visited: false,
          ownRating: null,
          addedAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    );
    mockPick.mockResolvedValueOnce({ ok: true, backup, skipped: 0 });
    const alert = answerAlerts('Zusammenführen');

    await render(wrap(<FavoritesManageSheet />));
    await fireEvent.press(screen.getByText('Importieren'));
    await waitFor(() =>
      expect(favoritesStore.getState().favorites.theirs?.note).toBe('aus Sicherung'),
    );
    expect(favoritesStore.getState().favorites.mine).toBeDefined();
    expect(alert).toHaveBeenLastCalledWith(
      'Import abgeschlossen',
      '1 neu hinzugefügt, 0 aktualisiert.',
    );
  });

  it('meldet ungültige Dateien', async () => {
    mockPick.mockResolvedValueOnce({ ok: false, error: 'Die Datei ist kein gültiges JSON.' });
    const alert = answerAlerts(null);
    await render(wrap(<FavoritesManageSheet />));
    await fireEvent.press(screen.getByText('Importieren'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Import nicht möglich',
        'Die Datei ist kein gültiges JSON.',
      ),
    );
  });
});
