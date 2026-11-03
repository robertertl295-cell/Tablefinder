import { Colors } from '@/constants/theme';
import { contrastRatio } from '@/utils/contrast';

/**
 * Alle Text-/Hintergrund-Kombinationen, die in der App vorkommen, müssen WCAG AA
 * für normalen Text erfüllen (≥ 4,5 : 1) – in Hell und Dunkel.
 */
const TEXT_TOKENS = ['text', 'textSecondary', 'accent', 'warning', 'danger', 'success'] as const;
const SURFACES = ['background', 'backgroundElement'] as const;

describe.each(['light', 'dark'] as const)('Kontrast (%s)', (scheme) => {
  const c = Colors[scheme];

  it.each(TEXT_TOKENS.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    '%s auf %s ≥ 4,5',
    (text, surface) => {
      expect(contrastRatio(c[text], c[surface])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('Text auf Akzentfarbe (Chips, Buttons) ≥ 4,5', () => {
    expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('Text auf ausgewählter Fläche ≥ 4,5', () => {
    expect(contrastRatio(c.text, c.backgroundSelected)).toBeGreaterThanOrEqual(4.5);
  });

  it('Schrift auf Gefahr-Banner (dauerhaft geschlossen) ≥ 4,5', () => {
    expect(contrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrastRatio', () => {
  it('Schwarz auf Weiß = 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
});
