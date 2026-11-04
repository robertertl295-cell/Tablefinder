import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Abstände für Bottom Sheets (Filter, Favoriten verwalten).
 * Nativ ist das Sheet ein echtes Blatt unterhalb der Statusleiste → keine Abstände nötig.
 * Im Web füllt es den ganzen Bildschirm → Abstand zu Statusleiste/Notch und Home-Leiste.
 */
export function useSheetInsets(): { top: number; bottom: number } {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? { top: insets.top, bottom: insets.bottom } : { top: 0, bottom: 0 };
}
