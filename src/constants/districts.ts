import type { LatLng } from '@/types/place';

export type District = { id: string; name: string; center: LatLng };

/** Beliebte Berliner Ortsteile mit ungefährem Mittelpunkt. */
export const DISTRICTS: readonly District[] = [
  { id: 'mitte', name: 'Mitte', center: { latitude: 52.5219, longitude: 13.4132 } },
  {
    id: 'prenzlauer-berg',
    name: 'Prenzlauer Berg',
    center: { latitude: 52.539, longitude: 13.424 },
  },
  { id: 'kreuzberg', name: 'Kreuzberg', center: { latitude: 52.4986, longitude: 13.4203 } },
  { id: 'friedrichshain', name: 'Friedrichshain', center: { latitude: 52.512, longitude: 13.454 } },
  { id: 'neukoelln', name: 'Neukölln', center: { latitude: 52.4811, longitude: 13.4354 } },
  { id: 'schoeneberg', name: 'Schöneberg', center: { latitude: 52.4842, longitude: 13.353 } },
  {
    id: 'charlottenburg',
    name: 'Charlottenburg',
    center: { latitude: 52.5065, longitude: 13.3105 },
  },
  { id: 'wilmersdorf', name: 'Wilmersdorf', center: { latitude: 52.487, longitude: 13.32 } },
  { id: 'wedding', name: 'Wedding', center: { latitude: 52.5475, longitude: 13.3585 } },
  { id: 'moabit', name: 'Moabit', center: { latitude: 52.5285, longitude: 13.342 } },
  { id: 'tempelhof', name: 'Tempelhof', center: { latitude: 52.466, longitude: 13.385 } },
  { id: 'treptow', name: 'Treptow', center: { latitude: 52.492, longitude: 13.47 } },
  { id: 'lichtenberg', name: 'Lichtenberg', center: { latitude: 52.513, longitude: 13.499 } },
  { id: 'pankow', name: 'Pankow', center: { latitude: 52.569, longitude: 13.402 } },
  { id: 'steglitz', name: 'Steglitz', center: { latitude: 52.456, longitude: 13.322 } },
];

export function findDistrict(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id);
}
