import { shouldShowInstallHint } from '@/components/install-hint.web';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('Hinweis „Zum Home-Bildschirm“', () => {
  it('erscheint in Safari auf dem iPhone', () => {
    expect(shouldShowInstallHint(IPHONE_SAFARI, false, false)).toBe(true);
  });

  it('nicht, wenn schon vom Home-Bildschirm gestartet oder geschlossen', () => {
    expect(shouldShowInstallHint(IPHONE_SAFARI, true, false)).toBe(false);
    expect(shouldShowInstallHint(IPHONE_SAFARI, false, true)).toBe(false);
  });

  it('nicht auf Android oder dem Desktop', () => {
    expect(shouldShowInstallHint('Mozilla/5.0 (Linux; Android 15)', false, false)).toBe(false);
    expect(
      shouldShowInstallHint('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', false, false),
    ).toBe(false);
  });
});
