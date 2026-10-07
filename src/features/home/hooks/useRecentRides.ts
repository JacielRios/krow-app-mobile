import { useQuery } from '@tanstack/react-query';
import type { SessionLoginMode } from '../../../app/sessionLoginMode';
import { rideApi, type RecentRideApiView } from '../../ride/api/rideApi';
import type { RideStatus } from '../../ride/types/ride.types';
export type RecentRideStatus = RideStatus;
export type RecentRide = RecentRideApiView;
export interface UseRecentRidesOptions {
  limit?: number;
}
export interface UseRecentRidesResult {
  rides: RecentRide[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  reload: () => void;
}
export function useRecentRides(
  role: SessionLoginMode | null,
  userId: string | null,
  options: UseRecentRidesOptions = {},
): UseRecentRidesResult {
  const limit = options.limit ?? 5;
  const context = role === 'conductor' ? 'driver' : 'passenger';
  const q = useQuery({
    queryKey: ['recent-rides', userId, context, limit],
    queryFn: () => rideApi.recent(limit, context),
    enabled: !!role && !!userId,
  });
  return {
    rides: q.data ?? [],
    loading: q.isLoading,
    error: q.error instanceof Error ? q.error.message : null,
    notice: null,
    reload: q.refetch,
  };
}
