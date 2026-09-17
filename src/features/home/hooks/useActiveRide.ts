import { useCallback, useEffect, useRef, useState } from 'react';
import { rideApi, type ActiveRideApiView } from '../../ride/api/rideApi';
import { useCurrentUserRole } from './useCurrentUserRole';

export type ActiveRideRole = 'driver' | 'passenger';
export type ActiveRideInfo = ActiveRideApiView;
export interface UseActiveRideResult {
  activeRide: ActiveRideInfo | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 5_000;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Error inesperado al cargar tu viaje activo.';

export function useActiveRide(): UseActiveRideResult {
  const { user, loading: userLoading } = useCurrentUserRole();
  const [activeRide, setActiveRide] = useState<ActiveRideInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchActive = useCallback(async (background = false) => {
    if (!user) {
      setActiveRide(null);
      setLoading(userLoading);
      return;
    }
    if (!background) setLoading(true);
    try {
      const data = await rideApi.active();
      if (!mounted.current) return;
      setActiveRide(data);
      setError(null);
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current && !background) setLoading(false);
    }
  }, [user, userLoading]);

  useEffect(() => {
    mounted.current = true;
    if (!userLoading) fetchActive().catch(() => undefined);
    const timer = user
      ? setInterval(() => fetchActive(true).catch(() => undefined), POLL_INTERVAL_MS)
      : undefined;
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [fetchActive, user, userLoading]);

  return { activeRide, loading, error };
}
