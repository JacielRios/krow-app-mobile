import { useCallback, useEffect, useState } from 'react';
import {
  getDirections,
  DirectionsResult,
  LatLng,
} from '../../../services/googleMaps';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirections = useCallback(async (): Promise<
    DirectionsResult | null
  > => {
    if (!origin || !destination) return null;

    setLoading(true);
    setError(null);
    try {
      const result = await getDirections(origin, destination, {
        departureTime: departureTime ?? undefined,
      });
      setDirections(result);
      return result;
    } catch (err: any) {
      setError(err?.message ?? 'Error al obtener la ruta');
      setDirections(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, departureTime]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoFetch) return;
    if (!origin || !destination) {
      setDirections(null);
      return;
    }
    fetchDirections();
  }, [autoFetch, origin?.lat, origin?.lng, destination?.lat, destination?.lng, fetchDirections]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setDirections(null);
    setError(null);
  };

  return { directions, loading, error, fetch: fetchDirections, reset };
}
