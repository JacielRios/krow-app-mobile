import { useCallback, useEffect, useRef, useState } from 'react';
import {
  rideApi,
  type ActiveRideDataApiView,
} from '../api/rideApi';

export type ActiveRideData = ActiveRideDataApiView;
type DriverData = Extract<ActiveRideData, { role: 'conductor' }>;
type PassengerData = Extract<ActiveRideData, { role: 'pasajero' }>;
export type ActivePassenger = DriverData['passengers'][number];
export type ActiveRideDriver = PassengerData['driver'];

export interface UseActiveRideDataResult {
  data: ActiveRideData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const POLL_INTERVAL_MS = 5_000;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Error inesperado al cargar el viaje.';

/** Datos del viaje activo servidos íntegramente por KROW API. */
export function useActiveRideData(rideId: string): UseActiveRideDataResult {
  const [data, setData] = useState<ActiveRideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const mounted = useRef(true);
  const reload = useCallback(() => setReloadTick(value => value + 1), []);

  const fetchAll = useCallback(async (background = false) => {
    if (!rideId) {
      setData(null);
      setLoading(false);
      return;
    }
    if (!background) setLoading(true);
    try {
      const result = await rideApi.activeView(rideId);
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current && !background) setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    mounted.current = true;
    fetchAll().catch(() => undefined);
    const timer = setInterval(
      () => fetchAll(true).catch(() => undefined),
      POLL_INTERVAL_MS,
    );
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [fetchAll, reloadTick]);

  return { data, loading, error, reload };
}
