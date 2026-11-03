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
