import { useInfiniteQuery } from '@tanstack/react-query';
import { rideApi } from '../api/rideApi';
import type { RideStatus } from '../types/ride.types';

export function useDriverTrips(status?: RideStatus) {
  const query = useInfiniteQuery({
    queryKey: ['driver-rides', status ?? 'all'],
    queryFn: ({ pageParam }) => rideApi.mine(status, pageParam, 50),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 50 ? pages.length * 50 : undefined,
  });
  return {
    trips: query.data?.pages.flat() ?? [],
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
