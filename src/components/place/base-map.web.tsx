import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

import { FALLBACK_TILES, mapStyleUrl, supportsWebGL } from './map-style';

/**
 * Hintergrundkarte für Leaflet: OpenFreeMap-Vektorkarte über MapLibre GL.
 * Ohne WebGL (oder wenn MapLibre scheitert) die Standard-OSM-Kacheln.
 */
export function BaseMap({ dark }: { dark: boolean }) {
  const map = useMap();
  const [vector] = useState(supportsWebGL);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!vector || failed) return;
    let layer: L.MaplibreGL | null = null;
    try {
      layer = L.maplibreGL({ style: mapStyleUrl(dark) });
      layer.addTo(map);
      layer.getMaplibreMap().on('error', (e) => {
        // Nur ein nicht ladbarer Stil ist fatal; einzelne fehlende Kacheln nicht.
        if (!layer?.getMaplibreMap().isStyleLoaded() && /style/i.test(String(e.error?.message))) {
          setFailed(true);
        }
      });
    } catch {
      // Asynchron melden: kein setState direkt im Effekt.
      queueMicrotask(() => setFailed(true));
    }
    return () => {
      layer?.remove();
    };
  }, [map, dark, vector, failed]);

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('tf-map-dark', dark);
    container.classList.toggle('tf-map-invert', dark && (!vector || failed));
  }, [map, dark, vector, failed]);

  if (vector && !failed) return null;
  return (
    <TileLayer
      url={FALLBACK_TILES.url}
      attribution={FALLBACK_TILES.attribution}
      maxZoom={FALLBACK_TILES.maxZoom}
    />
  );
}
