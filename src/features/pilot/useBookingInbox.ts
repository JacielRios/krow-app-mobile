import { useQuery } from '@tanstack/react-query';
import { pilotApi } from './pilotApi';
export function useBookingInbox(actorId?: string) {
  return useQuery({
    queryKey: ['booking-inbox', actorId],
    queryFn: ({ signal }) => pilotApi.inbox(actorId!, signal),
    enabled: !!actorId,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: 1,
  });
}
