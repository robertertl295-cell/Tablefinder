/* Globale Test-Mocks für native Module ohne JS-Implementierung. */

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef(function MapView(props: object, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(View, { ...props, testID: 'map-view' });
  });
  const Marker = (props: object) => React.createElement(View, props);
  return { __esModule: true, default: MapView, Marker };
});

// expo-sqlite hat in Jest keine native Datenbank → In-Memory-Ersatz mit gleicher API.
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => void data.set(key, value),
    removeItem: async (key: string) => void data.delete(key),
    clear: async () => data.clear(),
  };
  return { __esModule: true, default: storage, Storage: storage, AsyncStorage: storage };
});
