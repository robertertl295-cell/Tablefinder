import { StateMessage } from '@/components/state/state-message';

/**
 * react-native-maps läuft nicht im Browser. Web ist kein Ziel der App;
 * diese Variante hält nur die Web-Vorschau lauffähig.
 */
export function ResultsMap(_props: unknown) {
  return (
    <StateMessage
      icon="map"
      title="Karte nur in der App"
      message="Die Kartenansicht ist auf iOS und Android verfügbar."
    />
  );
}
