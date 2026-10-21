import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '../src/app/navigation/RootNavigator';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { sessionAdapter } from '../src/core/auth/sessionAdapter';

let mockAuth: (active: boolean, id?: string) => void;
let mockOpen: (event: { url: string }) => void;
let mockGate = false;
const mockNavigate = jest.fn();
const mockRef = {
  isReady: () => true,
  getRootState: () => ({
    routeNames: ['RideScheduled', 'BookingRequests', 'RideInvitation'],
  }),
  navigate: mockNavigate,
};
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => mockRef,
  DefaultTheme: { colors: {} },
  DarkTheme: { colors: {} },
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('react-native-config', () => ({
  KROW_PILOT_ENABLED: 'true',
  KROW_LINK_ORIGIN: 'https://krow-web-gamma.vercel.app',
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/app/conductorLoginGate', () => ({
  useConductorLoginGateBlocking: () => mockGate,
}));
jest.mock('../src/app/navigation/MainNavigator', () => () => null);
jest.mock('../src/features/pilot/BookingEventsHost', () => ({
  BookingEventsHost: () => null,
}));
jest.mock('../src/features/auth/navigation/AuthNavigator', () => () => null);
jest.mock('../src/features/auth/Screens/PasswordResetScreen', () => ({
  PasswordResetScreen: () => null,
}));
jest.mock('../src/features/ride-runtime/nativeNavigation', () => ({
  nativeNavigation: { stop: jest.fn(async () => undefined) },
}));
jest.mock('../src/features/pilot/nativeTracking', () => ({
  pilotTracking: { stop: jest.fn(async () => undefined) },
}));
jest.mock('../src/features/ride-runtime/pushRegistration', () => ({
  synchronizePushSession: jest.fn(),
}));
jest.mock('../src/features/pilot/pilotPush', () => ({
  synchronizePilotPush: jest.fn(),
}));
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: {
    getSession: jest.fn(),
    acceptAuthLink: jest.fn(async () => false),
    onAuthStateChange: (callback: typeof mockAuth) => {
      mockAuth = callback;
      return () => undefined;
    },
  },
}));

const origin = 'https://krow-web-gamma.vercel.app';
const id = '11111111-1111-4111-8111-111111111111';
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockGate = false;
  jest
    .mocked(sessionAdapter.getSession)
    .mockResolvedValue({ data: { session: null }, error: null });
  jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue(`${origin}/rides/${id}`);
  jest
    .spyOn(Linking, 'addEventListener')
    .mockImplementation((_type, callback) => {
      mockOpen = callback;
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof Linking.addEventListener
      >;
    });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache.clear();
  jest.restoreAllMocks();
});
const view = () => (
  <QueryClientProvider client={cache}>
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  </QueryClientProvider>
);
const settle = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 15));
  });
};
const mount = async () => {
  await act(async () => {
    tree = Renderer.create(view());
  });
  await settle();
};

test('retains a cold-start trip link until login and opens the pilot route without runtime v2', async () => {
  await mount();
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(() => mockAuth(true, 'actor'));
  await settle();
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('RideScheduled', { rideId: id });
});

test('opens a warm link after authentication and rejects another origin', async () => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  await mount();
  await act(() => mockAuth(true, 'actor'));
  await act(() => mockOpen({ url: `https://other.test/rides/${id}` }));
  await settle();
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(() => mockOpen({ url: `${origin}/rides/${id}` }));
  await settle();
  expect(mockNavigate).toHaveBeenCalledWith('RideScheduled', { rideId: id });
});

test('waits for the conductor login gate before opening the pending trip', async () => {
  mockGate = true;
  await mount();
  await act(() => mockAuth(true, 'actor'));
  await settle();
  expect(mockNavigate).not.toHaveBeenCalled();
  mockGate = false;
  await act(() => tree.update(view()));
  await settle();
  expect(mockNavigate).toHaveBeenCalledWith('RideScheduled', { rideId: id });
});
test('a cold notification link waits for login and opens its exact booking', async () => {
  const booking = '22222222-2222-4222-8222-222222222222';
  jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue(`${origin}/rides/${id}?bookingId=${booking}`);
  await mount();
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(() => mockAuth(true, 'actor'));
  await settle();
  expect(mockNavigate).toHaveBeenCalledWith('BookingRequests', {
    rideId: id,
    bookingId: booking,
  });
});

test('a shared invitation is retained through login and opens the join flow', async () => {
  jest
    .spyOn(Linking, 'getInitialURL')
    .mockResolvedValue(`${origin}/rides/${id}?invite=1`);
  await mount();
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(() => mockAuth(true, 'actor'));
  await settle();
  expect(mockNavigate).toHaveBeenCalledWith('RideInvitation', { rideId: id });
});
