import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamische Expo-Konfiguration.
 * Schlüssel kommen ausschließlich aus Umgebungsvariablen (.env), nie aus dem Code.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tisch',
  slug: 'tisch',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tisch',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'de.tisch.app',
    supportsTablet: false,
    // Nur Standard-HTTPS → keine Exportkontroll-Abfrage bei TestFlight/App Store.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'de.tisch.app',
    adaptiveIcon: {
      backgroundColor: '#F4EFE9',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Tisch nutzt deinen Standort, um Restaurants, Cafés und Bars in deiner Nähe zu finden.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
      },
    ],
    [
      'react-native-maps',
      {
        // iOS nutzt Apple Maps (kein Key nötig). Android braucht einen Google-Maps-SDK-Key.
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4EFE9',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  // Wird von `eas init` vergeben; bei dynamischer Konfiguration über die Umgebung setzen.
  ...(process.env.EAS_PROJECT_ID
    ? { extra: { ...config.extra, eas: { projectId: process.env.EAS_PROJECT_ID } } }
    : {}),
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
