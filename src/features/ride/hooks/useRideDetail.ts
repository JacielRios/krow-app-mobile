import { useQuery } from '@tanstack/react-query';
import { rideApi } from '../api/rideApi';
import { useCurrentUserRole } from '../../home/hooks/useCurrentUserRole';

export function useRideDetail(rideId?: string) {
  const { user } = useCurrentUserRole();
  const query = useQuery({
    queryKey: ['ride-detail', rideId, user?.userId],
    queryFn: () => rideApi.detail(rideId as string),
    enabled: Boolean(rideId && user),
  });
  return {
    ride: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
