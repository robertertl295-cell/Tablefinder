import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DialogHost } from '@/components/dialog-host';
import { Colors } from '@/constants/theme';

/**
 * Expo Router meldet im Web immer Abstände von 0 (kein Messen, wegen Server-Rendering).
 * In der Home-Bildschirm-App auf dem iPhone liegt die Seite aber unter Statusleiste und Notch –
 * deshalb hier im Web der echte Provider, der `env(safe-area-inset-*)` misst.
 */
function WebSafeArea({ children }: { children: ReactNode }) {
  return Platform.OS === 'web' ? <SafeAreaProvider>{children}</SafeAreaProvider> : children;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];

  return (
    <WebSafeArea>
      <ThemeProvider
        value={{
          ...base,
          colors: {
            ...base.colors,
            primary: colors.accent,
            background: colors.background,
            card: colors.background,
            text: colors.text,
            border: colors.border,
          },
        }}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="place/[id]"
            // Eigener Zurück-Button über dem Foto (gut lesbar auf jedem Bild).
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="favorites-manage"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
            }}
          />
          <Stack.Screen
            name="filters"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 20,
            }}
          />
        </Stack>
        <DialogHost />
      </ThemeProvider>
    </WebSafeArea>
  );
}
