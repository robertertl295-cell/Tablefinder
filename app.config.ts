import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamische Expo-Konfiguration.
 * Schlüssel kommen ausschließlich aus Umgebungsvariablen (.env), nie aus dem Code.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tablefinder',
  slug: 'tablefinder',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tablefinder',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'de.tablefinder.app',
    supportsTablet: false,
    // Nur Standard-HTTPS → keine Exportkontroll-Abfrage bei TestFlight/App Store.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'de.tablefinder.app',
    adaptiveIcon: {
      backgroundColor: '#B5432A',
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
          'Tablefinder nutzt deinen Standort, um Restaurants, Cafés und Bars in deiner Nähe zu finden.',
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
        backgroundColor: '#B5432A',
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
      },
    ],
  ],
  // Wird von `eas init` vergeben; bei dynamischer Konfiguration über die Umgebung setzen.
  ...(process.env.EAS_PROJECT_ID
    ? { extra: { ...config.extra, eas: { projectId: process.env.EAS_PROJECT_ID } } }
    : {}),
  experiments: {
    // Web-Version unter einem Unterpfad (GitHub Pages: /Tablefinder); sonst Wurzel.
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
    typedRoutes: true,
    reactCompiler: true,
  },
});
