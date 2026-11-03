import * as Location from 'expo-location';

import type { LatLng } from '@/types/place';

export type LocationResult =
  | { status: 'granted'; coords: LatLng }
  /** Nutzer hat die Freigabe verweigert. */
  | { status: 'denied' }
  /** Ortungsdienste aus, Zeitüberschreitung oder anderer Fehler. */
  | { status: 'unavailable' };

const timeout = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));

/**
 * Fragt (falls nötig) nach der Standortfreigabe „beim Verwenden der App“
 * und liefert die aktuelle Position. Wirft nie.
 */
export async function requestCurrentLocation(timeoutMs = 8000): Promise<LocationResult> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!permission.granted) return { status: 'denied' };

    if (!(await Location.hasServicesEnabledAsync())) return { status: 'unavailable' };

    // Eine frische, letzte bekannte Position ist sofort da und reicht für die Umgebungssuche.
    const last = await Location.getLastKnownPositionAsync({
      maxAge: 2 * 60_000,
      requiredAccuracy: 200,
    });
    const position =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        timeout(timeoutMs),
      ]));
    if (!position) return { status: 'unavailable' };

    return {
      status: 'granted',
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    };
  } catch {
    return { status: 'unavailable' };
  }
}
