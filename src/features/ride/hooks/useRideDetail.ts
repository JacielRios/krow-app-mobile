import { useQuery } from '@tanstack/react-query';
import { rideApi } from '../api/rideApi';

export function useRideDetail(rideId?: string) {
  const query = useQuery({
    queryKey: ['ride-detail', rideId],
    queryFn: () => rideApi.detail(rideId as string),
    enabled: Boolean(rideId),
  });
  return {
    ride: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
