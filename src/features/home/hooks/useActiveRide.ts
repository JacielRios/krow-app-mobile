import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { rideApi, type ActiveRideApiView } from '../../ride/api/rideApi';
import { useCurrentUserRole } from './useCurrentUserRole';
export type ActiveRideRole = 'driver' | 'passenger';
export type ActiveRideInfo = ActiveRideApiView;
export interface UseActiveRideResult {
  activeRide: ActiveRideInfo | null;
  loading: boolean;
  error: string | null;
}
export function useActiveRide(): UseActiveRideResult {
  const { user } = useCurrentUserRole();
  const focused = useIsFocused();
  const context = user?.role === 'conductor' ? 'driver' : 'passenger';
  const q = useQuery({
    queryKey: ['active-ride', user?.userId, context],
    queryFn: () => rideApi.active(context),
    enabled: !!user,
    refetchInterval: focused ? 5000 : false,
  });
  return {
    activeRide: q.data ?? null,
    loading: q.isLoading,
    error: q.error instanceof Error ? q.error.message : null,
  };
}
