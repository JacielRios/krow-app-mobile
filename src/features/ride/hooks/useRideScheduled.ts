import { useCallback, useEffect, useRef, useState } from 'react';
import {
  rideApi,
  type ScheduledRideApiView,
} from '../api/rideApi';

export type RideScheduledData = ScheduledRideApiView;
type PassengerData = Extract<RideScheduledData, { role: 'pasajero' }>;
export type MyBooking = NonNullable<PassengerData['myBooking']>;
export type ConductorInfo = NonNullable<PassengerData['conductorInfo']>;
export type VehicleInfo = NonNullable<PassengerData['vehicleInfo']>;

export interface UseRideScheduledResult {
  data: RideScheduledData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const POLL_INTERVAL_MS = 5_000;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Error inesperado al cargar el viaje.';

/** Vista de un viaje programado servida íntegramente por KROW API. */
export function useRideScheduled(rideId: string): UseRideScheduledResult {
  const [data, setData] = useState<RideScheduledData | null>(null);
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
      const result = await rideApi.scheduledView(rideId);
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
