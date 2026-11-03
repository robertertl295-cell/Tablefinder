import { MOCK_PLACES } from '@/services/places/mock-data';
import { placeAccessibilityLabel, placeStatus } from '@/utils/place-labels';

const byId = (id: string) => {
  const p = MOCK_PLACES.find((m) => m.id === id);
  if (!p) throw new Error(id);
  return p;
};

describe('placeStatus', () => {
  it('Betriebsstatus hat Vorrang vor Öffnungszeiten', () => {
    expect(placeStatus(true, 'closed_permanently')).toEqual({
      label: 'Dauerhaft geschlossen',
      tone: 'danger',
    });
    expect(placeStatus(true, 'closed_temporarily')?.tone).toBe('warning');
  });

  it('zeigt geöffnet/geschlossen und nichts bei unbekannt', () => {
    expect(placeStatus(true, 'operational')?.label).toBe('Jetzt geöffnet');
    expect(placeStatus(false, 'operational')?.label).toBe('Geschlossen');
    expect(placeStatus(null, 'unknown')).toBeNull();
  });
});

describe('placeAccessibilityLabel', () => {
  it('liest alle Angaben vor', () => {
    expect(placeAccessibilityLabel(byId('mock-ramen-kreuzberg'), 1234)).toBe(
      'Nudelwerk Ramen, Ramen-Restaurant, 4,6 von 5 Sternen aus 1.284 Bewertungen, ' +
        'Preisniveau mittel, 1,2 Kilometer entfernt, Jetzt geöffnet',
    );
  });

  it('nennt wenig Datenbasis und fehlende Bewertungen', () => {
    expect(placeAccessibilityLabel(byId('mock-vegan-kreuzberg'), null)).toContain(
      'Wenig Datenbasis',
    );
    expect(placeAccessibilityLabel(byId('mock-new-wedding'), null)).toBe(
      'Imbiss Neue Mitte, Restaurant, Noch keine Bewertungen',
    );
  });
});
