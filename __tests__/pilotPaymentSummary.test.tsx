import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button } from '../src/shared/components/ui-v2';
import { CashPaymentSummary } from '../src/features/ride/components/CashPaymentSummary';
import { ScheduledScreen } from '../src/features/pilot/ScheduledScreen';
import { HistoryScreen } from '../src/features/pilot/HistoryScreen';
import { pilotApi, type History } from '../src/features/pilot/pilotApi';
import { money } from '../src/shared/format';

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};
const mockConfirmAction = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { rideId: 'ride' } }),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock('../src/shared/components/ui-v2/useConfirmation', () => ({
  useConfirmation: () => ({ confirm: mockConfirmAction, dialog: null }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({ user: { userId: 'actor' } }),
}));
jest.mock('../src/features/pilot/nativeTracking', () => ({
  pilotTracking: { prepare: jest.fn() },
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  ...jest.requireActual('../src/features/pilot/pilotApi'),
  pilotApi: { history: jest.fn(), collect: jest.fn(), review: jest.fn() },
}));
jest.mock('../src/core/api/apiClient', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/features/ride/api/rideApi', () => ({
  rideApi: { start: jest.fn(), cancel: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { updateStatus: jest.fn() },
}));

let history: History;
let tree: Renderer.ReactTestRenderer | undefined;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  history = {
    role: 'driver',
    ride: {
      ride_id: 'ride',
      status: 'completed',
      departure_time: '2030-10-23T15:00:00Z',
      origin_address: 'Campus ITNL',
      destination_address: 'Biblioteca',
      driver_name: 'Luis',
      vehicle_brand: 'Auto',
      vehicle_model: 'Piloto',
      license_plate: 'TEST',
    },
    bookings: [
      {
        bookingId: 'booking',
        name: 'Ana',
        status: 'completed',
        amountCents: 2468,
        cashStatus: 'pending',
        pickupAddress: 'Campus ITNL',
        dropoffAddress: 'Biblioteca',
        pickupOrder: 1,
        dropoffOrder: 2,
        myReview: 5,
      },
    ],
  };
  jest.mocked(pilotApi.history).mockImplementation(async () => history);
  jest.mocked(pilotApi.collect).mockResolvedValue(undefined);
});
afterEach(async () => {
  if (tree) await act(() => tree!.unmount());
  tree = undefined;
  cache?.clear();
});
async function mount(screen: React.ReactNode) {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(['ride-context', 'actor', 'ride'], history);
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>{screen}</ThemeProvider>
      </QueryClientProvider>,
    );
  });
}
function button(title: string) {
  return tree!.root
    .findAllByType(Button)
    .find(node => node.props.title === title);
}

test.each([
  ['pending', 'El conductor debe aceptar tu solicitud'],
  ['confirmed', 'Tu lugar está reservado'],
])(
  'a %s reservation explains the next step without treating it as paid',
  async (status, nextStep) => {
    history.role = 'passenger';
    history.ride.status = 'scheduled';
    history.bookings[0].status = status;
    await mount(<ScheduledScreen />);
    expect(JSON.stringify(tree!.toJSON())).toContain(nextStep);
    expect(tree!.root.findByType(CashPaymentSummary).props).toMatchObject({
      amountCents: 2468,
      role: 'passenger',
    });
    expect(button('Cancelar reserva')).toBeDefined();
    expect(button('Confirmar efectivo recibido')).toBeUndefined();
    expect(pilotApi.collect).not.toHaveBeenCalled();
  },
);

test('a passenger sees the committed total and the driver receipt status without a collection action', async () => {
  history.role = 'passenger';
  await mount(<HistoryScreen />);
  expect(tree!.root.findByType(CashPaymentSummary).props).toMatchObject({
    amountCents: 2468,
    role: 'passenger',
    cashStatus: 'pending',
  });
  expect(JSON.stringify(tree!.toJSON())).toContain(money(2468));
  expect(button('Confirmar efectivo recibido')).toBeUndefined();
  expect(pilotApi.collect).not.toHaveBeenCalled();
});

test('a driver confirms the exact reservation total before recording cash once', async () => {
  await mount(<HistoryScreen />);
  await act(() => button('Confirmar efectivo recibido')!.props.onPress());
  const confirmation = mockConfirmAction.mock.calls[0][0];
  expect(confirmation.message).toContain(money(2468));
  expect(confirmation.confirmLabel).toBe('Confirmar efectivo recibido');
  expect(pilotApi.collect).not.toHaveBeenCalled();
  await act(async () => {
    confirmation.onConfirm();
    confirmation.onConfirm();
  });
  expect(pilotApi.collect).toHaveBeenCalledTimes(1);
  expect(pilotApi.collect).toHaveBeenCalledWith('booking');
});

test.each([
  ['completed', 'collected'],
  ['cancelled', 'void'],
  ['confirmed', 'pending'],
])(
  'a driver cannot collect from %s / %s through the summary',
  async (status, cashStatus) => {
    history.bookings[0].status = status;
    history.bookings[0].cashStatus = cashStatus;
    await mount(<HistoryScreen />);
    expect(button('Confirmar efectivo recibido')).toBeUndefined();
    expect(pilotApi.collect).not.toHaveBeenCalled();
  },
);
