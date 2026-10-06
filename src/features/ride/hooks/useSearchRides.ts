import { useCallback, useRef, useState } from 'react';
import { rideApi } from '../api/rideApi';
import type { AvailableRide } from '../types/rideSearch.types';

export interface UseSearchRidesResult {
  rides: AvailableRide[];
  loading: boolean;
  error: string | null;
  /** Lanza una búsqueda nueva. Usa esto desde un onPress, no desde un effect. */
  search: (options: SearchOptions) => Promise<AvailableRide[]>;
  reset: () => void;
}

export interface SearchOptions {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  maxDistanceKm?: number;
  pickupTransportStopId?: string;
  dropoffTransportStopId?: string;
  maxResults?: number;
  fromTime?: Date | null;
  toTime?: Date | null;
}

/**
 * Hook on-demand para buscar rides disponibles. La búsqueda no se dispara
 * automáticamente: el caller invoca `search()` cuando el formulario está listo.
 */
export function useSearchRides(): UseSearchRidesResult {
  const [rides, setRides] = useState<AvailableRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const search = useCallback(
    async (options: SearchOptions): Promise<AvailableRide[]> => {
      const currentRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const mapped = await rideApi.search(options);
        if (currentRequest === requestId.current) setRides(mapped);
        return mapped;
      } catch (e: any) {
        if (currentRequest === requestId.current) {
          setError(e?.message ?? 'Error inesperado al buscar viajes.');
          setRides([]);
        }
        return [];
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    requestId.current += 1;
    setRides([]);
    setError(null);
    setLoading(false);
  }, []);

  return { rides, loading, error, search, reset };
}
