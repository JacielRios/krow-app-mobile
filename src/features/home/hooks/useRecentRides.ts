import { useCallback, useEffect, useState } from 'react';
import type { SessionLoginMode } from '../../../app/sessionLoginMode';
import { rideApi, type RecentRideApiView } from '../../ride/api/rideApi';
import type { RideStatus } from '../../ride/types/ride.types';

export type RecentRideStatus = RideStatus;
export type RecentRide = RecentRideApiView;
export interface UseRecentRidesOptions { limit?: number }
export interface UseRecentRidesResult {
  rides: RecentRide[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  reload: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Error inesperado al cargar tus viajes.';

/** La API resuelve el rol y todas las consultas de negocio. */
export function useRecentRides(
  role: SessionLoginMode | null,
  userId: string | null,
  options: UseRecentRidesOptions = {},
): UseRecentRidesResult {
  const { limit = 5 } = options;
  const [rides, setRides] = useState<RecentRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick(value => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!role || !userId) {
      setRides([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    rideApi.recent(limit)
      .then(data => { if (active) setRides(data); })
      .catch(cause => { if (active) setError(errorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, userId, limit, reloadTick]);

  return { rides, loading, error, notice: null, reload };
}
