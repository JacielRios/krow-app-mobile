import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text as NativeText } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeScreen } from '../src/features/home/screens/HomeScreen';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { pilotApi, type History } from '../src/features/pilot/pilotApi';
import type { RecentRideApiView } from '../src/features/ride/api/rideApi';
import { TripListItem } from '../src/features/ride/components/TripPresentation';

let mockRides: RecentRideApiView[] = [];
const mockReload = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-config', () => ({ KROW_PILOT_ENABLED: 'true' }));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({
    user: { userId: 'passenger', role: 'pasajero', displayName: 'Ana' },
    loading: false,
    reload: mockReload,
  }),
}));
jest.mock('../src/features/home/hooks/useActiveRide', () => ({
  useActiveRide: () => ({ activeRide: null }),
}));
jest.mock('../src/features/home/hooks/useRecentRides', () => ({
  useRecentRides: () => ({ rides: mockRides, reload: mockReload }),
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { history: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { pendingCount: jest.fn() },
}));

let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
const context: History = {
  role: 'passenger',
  ride: {
    ride_id: 'ride',
    status: 'cancelled',
    departure_time: '2026-10-20T15:00:00Z',
    origin_address: 'Instituto Tecnológico de Nuevo León',
    destination_address: 'Av. Eloy Cavazos 7750, Guadalupe',
    driver_name: 'Luis',
    vehicle_brand: 'Auto',
    vehicle_model: 'Piloto',
    license_plate: 'TEST',
  },
  bookings: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  mockRides = [
    {
      rideId: 'ride',
      status: 'cancelled',
      departureTime: context.ride.departure_time,
      originLabel: '25.6640, -100.2432',
      destinationLabel: '25.6442, -100.1727',
      seats: 1,
      pricePerSeat: 20,
    },
  ];
  jest.mocked(pilotApi.history).mockResolvedValue(context);
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  cache.clear();
});
async function mount() {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <HomeScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
  });
}
test('only missing labels use real existing trip addresses and preserve trip navigation', async () => {
  mockRides.push({
    ...mockRides[0],
    rideId: 'named',
    originLabel: 'Campus',
    destinationLabel: 'Centro',
  });
  await mount();
  expect(pilotApi.history).toHaveBeenCalledTimes(1);
  expect(pilotApi.history).toHaveBeenCalledWith('ride');
  const item = tree.root.findAllByType(TripListItem)[0];
  expect(item.props.origin).toBe(context.ride.origin_address);
  expect(item.props.destination).toBe(context.ride.destination_address);
  expect(
    tree.root
      .findAllByType(NativeText)
      .flatMap(node => React.Children.toArray(node.props.children))
      .filter(child => typeof child === 'string' || typeof child === 'number')
      .join(' '),
  ).not.toContain('25.6640');
  await act(() => item.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('RideHistory', { rideId: 'ride' });
});
test('an existing detail cache avoids extra address requests', async () => {
  cache.setQueryData(['ride-context', 'passenger', 'ride'], context);
  await mount();
  expect(pilotApi.history).not.toHaveBeenCalled();
  expect(tree.root.findByType(TripListItem).props.origin).toBe(
    context.ride.origin_address,
  );
});
test('an unavailable detail request leaves an honest coordinate-free fallback', async () => {
  jest.mocked(pilotApi.history).mockRejectedValue(new Error('Sin red'));
  await mount();
  const output = tree.root
    .findAllByType(NativeText)
    .flatMap(node => React.Children.toArray(node.props.children))
    .filter(child => typeof child === 'string' || typeof child === 'number')
    .join(' ');
  expect(output).toContain('Destino guardado');
  expect(output).not.toContain('25.6640');
  expect(output).not.toContain('Av. Eloy Cavazos');
});
