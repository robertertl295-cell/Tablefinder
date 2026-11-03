/**
 * Design-Tokens für Tablefinder: ruhig, viel Weißraum, ein Akzentton (Terrakotta).
 * Alle Text/Hintergrund-Paare erfüllen WCAG AA (≥ 4.5:1).
 */
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1917',
    textSecondary: '#57534E',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F4',
    backgroundSelected: '#E7E5E4',
    border: '#E7E5E4',
    accent: '#B5432A',
    onAccent: '#FFFFFF',
    warning: '#92400E',
    danger: '#B91C1C',
    onDanger: '#FFFFFF',
    success: '#166534',
  },
  dark: {
    text: '#FAFAF9',
    textSecondary: '#A8A29E',
    background: '#0C0A09',
    backgroundElement: '#1C1917',
    backgroundSelected: '#292524',
    border: '#292524',
    accent: '#F0876B',
    onAccent: '#1C1917',
    warning: '#FBBF24',
    danger: '#F87171',
    onDanger: '#1C1917',
    success: '#4ADE80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
} as const;
