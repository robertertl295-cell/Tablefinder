/**
 * Messwerte zur Bildschirmdarstellung der Web-App (Home-Bildschirm-App auf dem iPhone).
 * Hilft, Layoutprobleme zu finden, die sich im Desktop-Browser nicht nachstellen lassen
 * (z. B. iOS 26: Seite kürzer als der Bildschirm, WebKit-Fehler 301108).
 * Enthält keine persönlichen Daten.
 */
export type ViewportDiagnostics = Record<string, string>;

/** Unsichtbares Messelement kurz einhängen und Höhe sowie Innenabstände ablesen. */
function probe(style: Partial<CSSStyleDeclaration>): {
  height: number;
  paddingTop: string;
  paddingBottom: string;
} {
  const el = document.createElement('div');
  Object.assign(el.style, { visibility: 'hidden', pointerEvents: 'none' }, style);
  document.body.appendChild(el);
  const computed = window.getComputedStyle(el);
  const out = {
    height: el.getBoundingClientRect().height,
    paddingTop: computed.paddingTop,
    paddingBottom: computed.paddingBottom,
  };
  el.remove();
  return out;
}

export function viewportDiagnostics(): ViewportDiagnostics | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const media = (q: string) => (window.matchMedia ? window.matchMedia(q).matches : false);
  const insets = probe({
    position: 'fixed',
    top: '0',
    left: '0',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  });
  const fixed = probe({ position: 'fixed', top: '0', bottom: '0', left: '0', width: '1px' });
  const lvh = probe({ position: 'absolute', top: '0', left: '0', width: '1px', height: '100lvh' });
  const root = document.getElementById('root')?.getBoundingClientRect();
  const html = document.documentElement;
  const os = /OS (\d+[_.]\d+(?:[_.]\d+)?)/.exec(nav.userAgent)?.[1]?.replace(/_/g, '.');
  const px = (n: number | undefined) => (n === undefined ? '–' : `${Math.round(n * 10) / 10}`);
  return {
    'Home-Bildschirm-App': `${nav.standalone === true ? 'ja' : 'nein'} / display-mode ${media('(display-mode: standalone)') ? 'ja' : 'nein'}`,
    Bildschirm: `${window.screen.width} × ${window.screen.height}`,
    'Fenster (innerHeight)': px(window.innerHeight),
    'Seite (clientHeight)': px(html.clientHeight),
    visualViewport: px(window.visualViewport?.height),
    '100lvh': px(lvh.height),
    'Fest oben–unten': px(fixed.height),
    'App-Fläche': root ? `${px(root.top)} bis ${px(root.bottom)}` : '–',
    'Rand oben / unten': `${insets.paddingTop} / ${insets.paddingBottom}`,
    'html-Höhe (CSS)': window.getComputedStyle(html).height,
    Klasse: html.className || '–',
    iOS: os ?? '–',
  };
}

export function formatDiagnostics(d: ViewportDiagnostics): string {
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}
