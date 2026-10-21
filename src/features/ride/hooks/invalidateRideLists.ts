import type { QueryClient } from '@tanstack/react-query';

export function invalidateRideLists(cache: QueryClient) {
  // A successful mutation remains successful even if refreshing a list fails.
  return Promise.allSettled(
    ['driver-rides', 'activity', 'recent-rides', 'active-ride'].map(key =>
      cache.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
