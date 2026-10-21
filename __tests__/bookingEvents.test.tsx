import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  acknowledgeBooking,
  readBookingReceipts,
  unseenBookingNotices,
} from '../src/features/pilot/bookingEvents';
import { BookingEventsHost } from '../src/features/pilot/BookingEventsHost';
import { BookingNoticeCard } from '../src/features/pilot/BookingNoticeCard';
import { pilotApi, type BookingNotice } from '../src/features/pilot/pilotApi';
import { bookingApi } from '../src/features/ride/api/bookingApi';
import { Button } from '../src/shared/components/ui-v2';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';

jest.mock('../src/core/api/apiClient', () => ({
  apiBaseUrl: () => 'https://api.test',
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { inbox: jest.fn(), bookingNotice: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { updateStatus: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/shared/components/ui-v2/AnimatedModal', () => ({
  AnimatedModal: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => (visible ? children : null),
}));
let nativeStore: Map<string, string>;
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
const item = (extra: Partial<BookingNotice> = {}): BookingNotice => ({
  bookingId: 'booking',
  rideId: 'ride',
  eventKey: 'booking:pending',
  role: 'driver',
  status: 'pending',
  rideStatus: 'scheduled',
  createdAt: new Date().toISOString(),
  departureTime: new Date(Date.now() + 3600000).toISOString(),
  passengerName: 'Ana',
  driverName: 'Luis',
  vehicle: 'Auto · TEST',
  origin: 'Campus',
  destination: 'Centro',
  pickupAddress: 'Biblioteca',
  dropoffAddress: 'Parque',
  seats: 1,
  amountCents: 1500,
  canRespond: true,
  ...extra,
});
const settle = async () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
beforeEach(() => {
  jest.clearAllMocks();
  nativeStore = new Map();
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async options => {
    const password = nativeStore.get(options?.service ?? '');
    return password
      ? ({
          username: 'events',
          password,
          service: options?.service ?? '',
          storage: 'test',
        } as never)
      : false;
  });
  jest
    .mocked(Keychain.setGenericPassword)
    .mockImplementation(async (_name, value, options) => {
      nativeStore.set(options?.service ?? '', value);
      return true as never;
    });
  jest.mocked(pilotApi.inbox).mockResolvedValue([item()]);
  jest.mocked(pilotApi.bookingNotice).mockResolvedValue(item());
  jest.mocked(bookingApi.updateStatus).mockResolvedValue({ success: true });
  AppState.currentState = 'active';
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache.clear();
  jest.restoreAllMocks();
});
async function mount(node: React.ReactNode) {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>{node}</ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await settle();
  await settle();
}
test('read receipts survive reopen, stay isolated by account and preserve simultaneous acknowledgements', async () => {
  await Promise.all([
    acknowledgeBooking('passenger', 'one:confirmed'),
    acknowledgeBooking('passenger', 'two:confirmed'),
  ]);
  const seen = await readBookingReceipts('passenger');
  expect(Object.keys(seen)).toEqual(['one:confirmed', 'two:confirmed']);
  expect(await readBookingReceipts('other')).toEqual({});
  expect(
    unseenBookingNotices(
      [item({ role: 'passenger', eventKey: 'one:confirmed' })],
      seen,
      new Set(),
    ),
  ).toEqual([]);
});
test('duplicates collapse and cancelled/unavailable driver requests do not prompt', () => {
  expect(unseenBookingNotices([item(), item()], {}, new Set())).toHaveLength(1);
  expect(
    unseenBookingNotices(
      [item({ canRespond: false, status: 'cancelled' })],
      {},
      new Set(),
    ),
  ).toEqual([]);
  expect(
    unseenBookingNotices(
      [item({ role: 'passenger' })],
      {},
      new Set(['booking:pending']),
    ),
  ).toEqual([]);
});
test('driver recovers a request at normal launch and can postpone it while the inbox stays intact', async () => {
  await mount(
    <BookingEventsHost
      actorId="driver"
      routeName="Inicio"
      onOpen={jest.fn()}
    />,
  );
  expect(tree.root.findAllByType(BookingNoticeCard)).toHaveLength(1);
  await act(() =>
    tree.root
      .findAllByType(Button)
      .find(b => b.props.title === 'Revisar después')!
      .props.onPress(),
  );
  await settle();
  expect(tree.root.findAllByType(BookingNoticeCard)).toHaveLength(0);
  expect(cache.getQueryData(['booking-inbox', 'driver'])).toMatchObject([
    { bookingId: 'booking', canRespond: true },
  ]);
});
test('response rechecks state, suppresses double taps and refreshes instead of accepting a cancelled request', async () => {
  jest
    .mocked(pilotApi.bookingNotice)
    .mockResolvedValueOnce(item({ status: 'cancelled', canRespond: false }));
  const changed = jest.fn(async () => undefined);
  await mount(
    <BookingNoticeCard
      item={item()}
      actorId="driver"
      fresh
      onChanged={changed}
      onOpen={jest.fn()}
    />,
  );
  await act(async () => {
    const press = tree.root
      .findAllByType(Button)
      .find(b => b.props.title === 'Aceptar solicitud')!.props.onPress;
    press();
    press();
  });
  expect(pilotApi.bookingNotice).toHaveBeenCalledTimes(1);
  expect(bookingApi.updateStatus).not.toHaveBeenCalled();
  expect(changed).toHaveBeenCalled();
});
test('a passenger confirmation appears once and is not repeated after reopening', async () => {
  jest.mocked(pilotApi.inbox).mockResolvedValue([
    item({
      role: 'passenger',
      status: 'confirmed',
      eventKey: 'booking:confirmed',
      canRespond: false,
    }),
  ]);
  await mount(
    <BookingEventsHost
      actorId="passenger"
      routeName="Inicio"
      onOpen={jest.fn()}
    />,
  );
  expect(tree.root.findAllByType(BookingNoticeCard)).toHaveLength(1);
  await act(async () =>
    tree.root
      .findAllByType(Button)
      .find(b => b.props.title === 'Entendido')!
      .props.onPress(),
  );
  await settle();
  await act(() => tree.unmount());
  cache.clear();
  await mount(
    <BookingEventsHost
      actorId="passenger"
      routeName="Inicio"
      onOpen={jest.fn()}
    />,
  );
  expect(tree.root.findAllByType(BookingNoticeCard)).toHaveLength(0);
});
test('failed refresh prevents operations until reconnection restores current state', async () => {
  await mount(
    <BookingEventsHost
      actorId="driver"
      routeName="Inicio"
      onOpen={jest.fn()}
    />,
  );
  jest
    .mocked(pilotApi.inbox)
    .mockRejectedValue(new Error('Network unavailable'));
  // Cache keeps the last summary, but no foreground prompt may act on it.
  await act(async () => {
    await cache.refetchQueries({ queryKey: ['booking-inbox', 'driver'] });
  });
  await settle();
  expect(tree.root.findAllByType(BookingNoticeCard)).toHaveLength(0);
  jest.mocked(pilotApi.inbox).mockResolvedValue([]);
  await act(async () => {
    await cache.refetchQueries({ queryKey: ['booking-inbox', 'driver'] });
  });
  await settle();
  expect(cache.getQueryData(['booking-inbox', 'driver'])).toEqual([]);
});
