import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Bildschirm mit Abstand zur Statusleiste/Notch. Nutzt die gemessenen Abstände direkt –
 * `SafeAreaView` setzte sie in der Web-App auf dem iPhone nicht um (Suchleiste unter der Uhr).
 */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, paddingTop: insets.top, backgroundColor: theme.background }, style]}>
      {children}
    </View>
  );
}
