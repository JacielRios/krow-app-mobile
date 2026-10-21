import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RideInvitationScreen } from '../src/features/pilot/RideInvitationScreen';
import { pilotApi, type RideInvitation } from '../src/features/pilot/pilotApi';
import { bookingApi } from '../src/features/ride/api/bookingApi';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button, ListRow } from '../src/shared/components/ui-v2';

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, goBack: jest.fn() }),
  useRoute: () => ({ params: { rideId: 'ride' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({
    user: { userId: 'passenger' },
    loading: false,
    reload: jest.fn(),
  }),
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { invitation: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { request: jest.fn() },
}));
const invitation: RideInvitation = {
  rideId: 'ride',
  status: 'scheduled',
  departureTime: '2099-01-01T16:00:00Z',
  origin: 'Campus',
  destination: 'Centro',
  driverName: 'Ana',
  vehicle: 'Auto',
  availableSeats: 2,
  pricePerSeatCents: 1500,
  owned: false,
  bookingId: null,
  canRequest: true,
  stops: [
    { stopId: 'a', order: 0, address: 'Campus' },
    { stopId: 'b', order: 1, address: 'Parque' },
    { stopId: 'c', order: 2, address: 'Centro' },
  ],
};
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
const settle = async () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 15));
  });
const button = (title: string) =>
  tree.root.findAllByType(Button).find(b => b.props.title === title)!;
const mount = async () => {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <RideInvitationScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await settle();
};
beforeEach(() => {
  jest.clearAllMocks();
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  jest.mocked(pilotApi.invitation).mockResolvedValue(invitation);
  jest.mocked(bookingApi.request).mockResolvedValue({ bookingId: 'booking' });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache.clear();
});
test('the shared link requires an ordered pair and a deliberate request, without auto-confirming', async () => {
  await mount();
  expect(bookingApi.request).not.toHaveBeenCalled();
  expect(button('Solicitar un lugar').props.disabled).toBe(true);
  await act(() =>
    tree.root
      .findAllByType(ListRow)
      .find(node => node.props.title === 'Campus')!
      .props.onPress(),
  );
  await act(() =>
    tree.root
      .findAllByType(ListRow)
      .find(node => node.props.title === 'Centro')!
      .props.onPress(),
  );
  expect(button('Solicitar un lugar').props.disabled).toBe(false);
  await act(async () => {
    const send = button('Solicitar un lugar').props.onPress;
    send();
    send();
  });
  await settle();
  expect(bookingApi.request).toHaveBeenCalledTimes(1);
  expect(bookingApi.request).toHaveBeenCalledWith(
    'ride',
    'a',
    'c',
    1,
    'passenger',
  );
  expect(mockReplace).toHaveBeenCalledWith('RideScheduled', { rideId: 'ride' });
});
test('a cancellation between preview and confirmation prevents sending', async () => {
  await mount();
  await act(() =>
    tree.root
      .findAllByType(ListRow)
      .find(node => node.props.title === 'Campus')!
      .props.onPress(),
  );
  await act(() =>
    tree.root
      .findAllByType(ListRow)
      .find(node => node.props.title === 'Centro')!
      .props.onPress(),
  );
  jest.mocked(pilotApi.invitation).mockResolvedValue({
    ...invitation,
    canRequest: false,
    status: 'cancelled',
  });
  await act(async () => button('Solicitar un lugar').props.onPress());
  await settle();
  expect(bookingApi.request).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
test('an existing booking opens its protected detail instead of creating another request', async () => {
  jest.mocked(pilotApi.invitation).mockResolvedValue({
    ...invitation,
    bookingId: 'booking',
    canRequest: false,
  });
  await mount();
  expect(mockReplace).toHaveBeenCalledWith('RideScheduled', { rideId: 'ride' });
  expect(bookingApi.request).not.toHaveBeenCalled();
});

test('a cached booking waits for server revalidation before redirecting after cancellation', async () => {
  cache.setQueryData(['ride-invitation', 'passenger', 'ride'], {
    ...invitation,
    bookingId: 'cancelled-booking',
    canRequest: false,
  });
  await mount();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(button('Solicitar un lugar')).toBeDefined();
});
