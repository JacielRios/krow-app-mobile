import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDirections,
  DirectionsResult,
  LatLng,
} from '../api/mapsApi';

interface UseDirectionsOptions {
  /** Si true, recalcula automáticamente cuando origin/destination cambian. */
  autoFetch?: boolean;
  departureTime?: Date | null;
}

interface UseDirectionsResult {
  directions: DirectionsResult | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<DirectionsResult | null>;
  reset: () => void;
}

/**
 * Hook que obtiene el polyline + distancia/duración entre dos puntos via
 * Google Directions API.
 */
export function useDirections(
  origin: LatLng | null,
  destination: LatLng | null,
  options: UseDirectionsOptions = {},
): UseDirectionsResult {
  const { autoFetch = true, departureTime } = options;
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const currentKey = origin && destination
    ? `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${departureTime?.toISOString() ?? ''}`
    : null;

  const fetchDirections = useCallback(async (): Promise<
    DirectionsResult | null
  > => {
    if (!origin || !destination) return null;

    setLoading(true);
    setError(null);
    const currentRequest = ++requestId.current;
    try {
      const result = await getDirections(origin, destination, {
        departureTime: departureTime ?? undefined,
      });
      if (currentRequest === requestId.current) {
        setDirections(result);
        setResultKey(currentKey);
      }
      return result;
    } catch (err: any) {
      if (currentRequest === requestId.current) {
        setError(err?.message ?? 'Error al obtener la ruta');
        setDirections(null);
        setResultKey(null);
      }
      return null;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [currentKey, origin?.lat, origin?.lng, destination?.lat, destination?.lng, departureTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoFetch) return;
    if (!origin || !destination) {
      requestId.current += 1;
      setDirections(null);
      setResultKey(null);
      return;
    }
    fetchDirections();
  }, [autoFetch, origin?.lat, origin?.lng, destination?.lat, destination?.lng, fetchDirections]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    requestId.current += 1;
    setDirections(null);
    setResultKey(null);
    setError(null);
  };

  return {
    directions: currentKey && resultKey === currentKey ? directions : null,
    loading,
    error: currentKey && resultKey === currentKey ? error : null,
    fetch: fetchDirections,
    reset,
  };
}
