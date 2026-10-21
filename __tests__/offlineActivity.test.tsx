import { KrowAlert as Alert } from '../src/shared/components/ui-v2/dialogService';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import * as Keychain from 'react-native-keychain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityScreen } from '../src/features/pilot/ActivityScreen';
import { pilotApi, type ActivityItem } from '../src/features/pilot/pilotApi';
import { readProfile } from '../src/features/pilot/readOnlyQueries';
import { userApi } from '../src/features/auth/api/userApi';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { TripListItem } from '../src/features/ride/components/TripPresentation';
import { Button } from '../src/shared/components/ui-v2';
import { ApiError } from '../src/core/api/apiClient';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: () => undefined,
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
jest.mock('../src/features/auth/api/userApi', () => ({
  userApi: { me: jest.fn() },
}));
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: { getSession: jest.fn() },
}));
const stored = new Map<string, string>();
const trip: ActivityItem = {
  rideId: 'ride',
  status: 'scheduled',
  departureTime: '2030-01-01T18:00:00Z',
  originAddress: 'Campus',
  destinationAddress: 'Saved destination',
  bookingId: null,
  bookingStatus: null,
  amountCents: null,
  pricePerSeatCents: 1234,
};
let tree: Renderer.ReactTestRenderer | undefined;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  stored.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => 0);
  jest
    .mocked(Keychain.setGenericPassword)
    .mockImplementation(async (_name, password, options) => {
      stored.set(options!.service!, password);
      return {
        service: options!.service!,
        storage: 'Keystore' as Keychain.STORAGE_TYPE,
      };
    });
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async options => {
    const password = stored.get(options!.service!);
    return password
      ? {
          username: 'driver',
          password,
          service: options!.service!,
          storage: 'Keystore' as Keychain.STORAGE_TYPE,
        }
      : false;
  });
  jest
    .mocked(Keychain.resetGenericPassword)
    .mockImplementation(async options => {
      stored.delete(options!.service!);
      return true;
    });
  jest.mocked(pilotApi.activity).mockResolvedValue([trip]);
});
afterEach(async () => {
  if (tree) await act(() => tree!.unmount());
  cache?.clear();
  tree = undefined;
  jest.restoreAllMocks();
});
async function mount() {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <ActivityScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
  });
}
const updateButton = () =>
  tree!.root
    .findAllByType(Button)
    .find(button => button.props.title === 'Actualizar viajes')!;

test('restores summaries after a fresh cache, blocks stale detail navigation and replaces them after reconnection', async () => {
  await mount();
  expect(stored.size).toBe(1);
  await act(() => tree!.unmount());
  tree = undefined;
  cache.clear();
  jest.mocked(pilotApi.activity).mockRejectedValue(new ApiError(0, {}));
  await mount();
  expect(tree!.root.findByType(TripListItem).props.destination).toBe(
    'Saved destination',
  );
  expect(updateButton()).toBeDefined();
  await act(() => tree!.root.findByType(TripListItem).props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith(
    'Información guardada',
    expect.stringContaining('Conéctate'),
  );
  expect(mockNavigate).not.toHaveBeenCalled();
  jest
    .mocked(pilotApi.activity)
    .mockResolvedValue([{ ...trip, destinationAddress: 'Fresh destination' }]);
  await act(async () => updateButton().props.onPress());
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
  });
  expect(tree!.root.findByType(TripListItem).props.destination).toBe(
    'Fresh destination',
  );
  expect(updateButton()).toBeUndefined();
  await act(() => tree!.root.findByType(TripListItem).props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('RideScheduled', {
    rideId: 'ride',
  });
});

test('an authorization rejection removes stored summaries instead of restoring them', async () => {
  await mount();
  await act(() => tree!.unmount());
  tree = undefined;
  cache.clear();
  jest.mocked(pilotApi.activity).mockRejectedValue(new ApiError(403, {}));
  await mount();
  expect(tree!.root.findAllByType(TripListItem)).toHaveLength(0);
  expect(stored.size).toBe(0);
});

test('a cached profile cannot grant publication permission or retain extra response fields', async () => {
  const profile = {
    userId: 'driver',
    fullName: 'Driver',
    email: null,
    profilePhoto: null,
    rating: null,
    role: 'conductor' as const,
    canPublishRides: true,
    driverProfile: {
      driverId: 'driver-profile',
      status: 'approved',
      rating: null,
    },
    unexpectedToken: 'synthetic-value-to-drop',
  };
  jest.mocked(userApi.me).mockResolvedValue(profile);
  expect((await readProfile('driver')).canPublishRides).toBe(true);
  expect([...stored.values()].join()).not.toContain('unexpectedToken');
  jest.mocked(userApi.me).mockRejectedValue(new ApiError(0, {}));
  const restored = await readProfile('driver');
  expect(restored.userId).toBe('driver');
  expect(restored.canPublishRides).toBe(false);
  expect(restored.offlineSavedAt).toEqual(expect.any(Number));
});
