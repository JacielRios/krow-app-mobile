import { useEffect, useState } from 'react';

import { decodePolyline } from '../utils/polyline';
import type { DriverLocation } from './useDriverLocationBroadcast';

interface Options {
  /** Polyline encoded de Google Directions. Si null, usa una linea recta origen->destino. */
  routePolyline: string | null;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  /** Si false, devuelve null y no avanza. */
  active: boolean;
  /** Duracion total simulada del viaje (ms). Default 5min. */
  totalDurationMs?: number;
  /** Frecuencia de tick (ms). Default 1500. */
  tickMs?: number;
}

/**
 * Generador de ubicaciones falso pero realista. Interpola sobre los puntos
 * de la polyline (o la linea recta) en una duracion fija. Sirve para demo y
 * QA sin requerir GPS real.
 *
 * Cuando se integre `@react-native-community/geolocation`, este hook puede
 * reemplazarse por uno que llame a `Geolocation.watchPosition` y exponga la
 * misma forma {lat,lng,heading,speed,ts}.
 */
export function useFakeDriverLocation({
  routePolyline,
  origin,
  destination,
  active,
  totalDurationMs = 5 * 60 * 1000,
  tickMs = 1500,
}: Options): DriverLocation | null {
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!active) {
      setLocation(null);
      return;
    }

    const points = (() => {
      if (routePolyline) {
        try {
          const decoded = decodePolyline(routePolyline);
          if (decoded.length >= 2) return decoded;
        } catch {
          // fallback abajo
        }
      }
      return [origin, destination];
    })();

    const startedAt = Date.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / totalDurationMs);

      // t mapea a un indice continuo en `points`.
      const idxFloat = t * (points.length - 1);
      const i = Math.floor(idxFloat);
      const frac = idxFloat - i;
      const a = points[i];
      const b = points[Math.min(i + 1, points.length - 1)];
      const lat = a.lat + (b.lat - a.lat) * frac;
      const lng = a.lng + (b.lng - a.lng) * frac;

      // Heading aproximado entre a y b
      const heading = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);

      setLocation({
        lat,
        lng,
        heading: Number.isFinite(heading) ? heading : null,
        speed: null,
        ts: Date.now(),
      });
    };

    tick();
    const id = setInterval(tick, tickMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, routePolyline, origin.lat, origin.lng, destination.lat, destination.lng, totalDurationMs, tickMs]);

  return location;
}
