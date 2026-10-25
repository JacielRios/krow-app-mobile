import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button, Skeleton } from '../src/shared/components/ui-v2';
import { BookingRequestsScreen } from '../src/features/pilot/BookingRequestsScreen';
import { BookingNoticeCard } from '../src/features/pilot/BookingNoticeCard';
import { bookingApi } from '../src/features/ride/api/bookingApi';
import type { BookingNotice } from '../src/features/pilot/pilotApi';

const mockNavigate = jest.fn();
const mockInbox = {
  data: [] as BookingNotice[],
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null as Error | null,
  refetch: jest.fn(),
};
let mockUser: { userId: string } | null = { userId: 'actor' };
let mockUserLoading = false;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setParams: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({
    user: mockUser,
    loading: mockUserLoading,
    reload: jest.fn(),
  }),
}));
jest.mock('../src/features/pilot/useBookingInbox', () => ({
  useBookingInbox: () => mockInbox,
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { bookingNotice: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { updateStatus: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, left: 0, bottom: 0 }),
}));

const notice = (
  bookingId: string,
  extra: Partial<BookingNotice> = {},
): BookingNotice => ({
  bookingId,
  rideId: 'ride',
  eventKey: bookingId + ':pending',
  role: 'driver',
  status: 'pending',
  rideStatus: 'scheduled',
  createdAt: '2026-10-23T12:00:00Z',
  departureTime: '2026-10-24T12:00:00Z',
  passengerName: 'Ana',
  driverName: 'Luis',
  vehicle: 'Auto',
  origin: 'ITNL',
  destination: 'Centro',
  pickupAddress: 'Campus',
  dropoffAddress: 'Biblioteca',
  seats: 2,
  amountCents: 4200,
  canRespond: true,
  ...extra,
});
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { userId: 'actor' };
  mockUserLoading = false;
  Object.assign(mockInbox, {
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache.clear();
});
async function mount() {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <BookingRequestsScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
}
function renderedText(node: Renderer.ReactTestInstance = tree.root): string {
  return node.children
    .map(child => (typeof child === 'string' ? child : renderedText(child)))
    .join(' ');
}

test('puts actionable requests first without hiding history or changing their destinations', async () => {
  mockInbox.data = [
    notice('answered', { canRespond: false, status: 'confirmed' }),
    notice('respond'),
    notice('passenger', {
      role: 'passenger',
      canRespond: false,
      status: 'confirmed',
    }),
  ];
  await mount();
  const cards = tree.root.findAllByType(BookingNoticeCard);
  expect(cards.map(card => card.props.item.bookingId)).toEqual([
    'respond',
    'answered',
    'passenger',
  ]);
  await act(() => cards[0].props.onOpen());
  expect(mockNavigate).toHaveBeenCalledWith('RideScheduled', {
    rideId: 'ride',
  });
  expect(renderedText()).toContain('Por responder');
});

test.each(['fetching', 'error'])(
  'keeps stale request actions disabled while %s',
  async state => {
    mockInbox.data = [notice('respond')];
    mockInbox.isFetching = state === 'fetching';
    mockInbox.isError = state === 'error';
    mockInbox.error = state === 'error' ? new Error('Sin conexión') : null;
    await mount();
    const accept = tree.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Aceptar solicitud')!;
    expect(accept.props.disabled).toBe(true);
    await act(() => accept.props.onPress());
    expect(bookingApi.updateStatus).not.toHaveBeenCalled();
  },
);

test('account bootstrap shows loading instead of claiming the inbox is empty', async () => {
  mockUser = null;
  mockUserLoading = true;
  await mount();
  expect(tree.root.findAllByType(Skeleton)).toHaveLength(1);
  expect(renderedText()).not.toContain('Todo al día');
});

test('pending passenger request explicitly waits for acceptance and shows the reserved total', async () => {
  mockInbox.data = [
    notice('waiting', { role: 'passenger', canRespond: false }),
  ];
  await mount();
  const text = renderedText();
  expect(text).toContain('todavía no reserva tu lugar');
  expect(text).toContain('$42.00');
  expect(
    tree.root
      .findAllByType(Button)
      .some(button => button.props.title === 'Aceptar solicitud'),
  ).toBe(false);
});
