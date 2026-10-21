import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityScreen } from '../src/features/pilot/ActivityScreen';
import { pilotApi } from '../src/features/pilot/pilotApi';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { TripListItem } from '../src/features/ride/components/TripPresentation';

let mockFocused = false;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    require('react').useEffect(() => {
      if (mockFocused) return callback();
      return undefined;
    }, [callback, mockFocused]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({ user: { userId: 'driver', role: 'conductor' } }),
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { activity: jest.fn() },
}));

test('refreshes a previously mounted activity tab when returning from publication', async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const trip = {
    rideId: 'old',
    status: 'scheduled',
    departureTime: '2026-10-21T18:00:00Z',
    originAddress: 'Campus',
    destinationAddress: 'Old destination',
    bookingId: null,
    bookingStatus: null,
    amountCents: null,
    pricePerSeatCents: 1234,
  };
  cache.setQueryData(['activity', 'driver', 'driver', 'upcoming'], {
    pages: [{ data: [trip], source: 'network', savedAt: Date.now() }],
    pageParams: [0],
  });
  jest
    .mocked(pilotApi.activity)
    .mockResolvedValue([
      { ...trip, rideId: 'new', destinationAddress: 'New destination' },
    ]);
  const view = () => (
    <QueryClientProvider client={cache}>
      <ThemeProvider>
        <ActivityScreen />
      </ThemeProvider>
    </QueryClientProvider>
  );
  let tree!: Renderer.ReactTestRenderer;
  try {
    await act(() => {
      tree = Renderer.create(view());
    });
    expect(pilotApi.activity).not.toHaveBeenCalled();
    expect(tree.root.findByType(TripListItem).props.destination).toBe(
      'Old destination',
    );
    mockFocused = true;
    await act(() => {
      tree.update(view());
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });
    expect(pilotApi.activity).toHaveBeenCalledWith(
      'driver',
      'upcoming',
      0,
      'driver',
    );
    expect(tree.root.findByType(TripListItem).props.destination).toBe(
      'New destination',
    );
  } finally {
    await act(() => tree?.unmount());
    cache.clear();
    mockFocused = false;
  }
});
