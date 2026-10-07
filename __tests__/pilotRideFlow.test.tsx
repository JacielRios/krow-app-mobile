import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button } from '../src/shared/components/ui-v2';
import { TrackingScreen } from '../src/features/pilot/TrackingScreen';
import { ScheduledScreen } from '../src/features/pilot/ScheduledScreen';
import { ReservationProgress } from '../src/features/pilot/ReservationProgress';
import { RoutePreviewMap } from '../src/features/maps';
import {
  pilotApi,
  type History,
  type TrackingSnapshot,
} from '../src/features/pilot/pilotApi';
import { pilotTracking } from '../src/features/pilot/nativeTracking';
import {
  rideApi,
  type ActiveRideDataApiView,
} from '../src/features/ride/api/rideApi';

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};
const mockRefresh = jest.fn(async () => undefined);
let mockSnapshot: TrackingSnapshot;
let mockState = 'live';
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { rideId: 'ride' } }),
  useIsFocused: () => mockFocused,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock('react-native-config', () => ({ KROW_TRACKING_ENABLED: 'true' }));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({ user: { userId: 'driver' } }),
}));
jest.mock('../src/features/maps', () => ({ RoutePreviewMap: () => null }));
jest.mock('../src/features/pilot/useTracking', () => ({
  useTracking: () => ({
    snapshot: mockSnapshot,
    state: mockState,
    ageSeconds: mockState === 'live' ? 1 : 35,
    refresh: mockRefresh,
    error: null,
  }),
}));
jest.mock('../src/features/pilot/nativeTracking', () => ({
  pilotTracking: {
    prepare: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    status: jest.fn(),
    cancelStart: jest.fn(),
  },
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  ...jest.requireActual('../src/features/pilot/pilotApi'),
  pilotApi: { attend: jest.fn(), history: jest.fn() },
}));
jest.mock('../src/core/api/apiClient', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/features/ride/api/rideApi', () => ({
  rideApi: { activeView: jest.fn(), start: jest.fn(), complete: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { updateStatus: jest.fn() },
}));

const ride = {
  rideId: 'ride',
  driverId: 'driver',
  status: 'in_progress' as const,
  departureTime: '2026-10-07T15:00:00Z',
  availableSeats: 1,
  pricePerSeat: 12.34,
  originAddress: 'Origen',
  destinationAddress: 'Destino',
  originLat: 25.67,
  originLng: -100.3,
  destinationLat: 25.68,
  destinationLng: -100.31,
  routePolyline: 'published',
};
const active: ActiveRideDataApiView = {
  role: 'conductor',
  ride,
  passengers: [],
  canComplete: false,
};
let history: History;
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockState = 'live';
  mockFocused = true;
  const stop = {
    stopId: 'stop',
    order: 2,
    lat: 25.68,
    lng: -100.31,
    address: 'Biblioteca universitaria',
    pickups: [],
    dropoffs: [{ bookingId: 'booking', name: 'Ana' }],
  };
  mockSnapshot = {
    rideId: 'ride',
    role: 'driver',
    position: {
      seq: 1,
      capturedAt: new Date().toISOString(),
      lat: 25.68,
      lng: -100.31,
      accuracy: 8,
    },
    state: 'live',
    ageSeconds: 1,
    route: {
      polyline: 'operative',
      durationSeconds: 120,
      version: 'v1',
      error: null,
    },
    stops: [stop],
    nextStop: stop,
    myStop: null,
    myPickup: null,
    nextAction: null,
    etaSeconds: 120,
    canComplete: false,
  };
  history = {
    role: 'driver',
    ride: {
      ride_id: 'ride',
      status: 'scheduled',
      departure_time: ride.departureTime,
      origin_address: 'Origen',
      destination_address: 'Destino',
      driver_name: 'Luis',
      vehicle_brand: 'Auto',
      vehicle_model: 'Piloto',
      license_plate: 'TEST',
    },
    bookings: [],
  };
  jest.mocked(rideApi.activeView).mockResolvedValue(active);
  jest.mocked(rideApi.start).mockResolvedValue(undefined as never);
  jest.mocked(rideApi.complete).mockResolvedValue(undefined as never);
  jest.mocked(pilotApi.history).mockImplementation(async () => history);
  jest.mocked(pilotApi.attend).mockResolvedValue(undefined);
  jest.mocked(pilotTracking.prepare).mockResolvedValue(undefined);
  jest.mocked(pilotTracking.start).mockResolvedValue(undefined);
  jest.mocked(pilotTracking.stop).mockResolvedValue(undefined);
  jest
    .mocked(pilotTracking.status)
    .mockResolvedValue({ rideId: null, sessionId: null, error: null });
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  cache?.clear();
  jest.restoreAllMocks();
});
async function mount(screen: React.ReactNode, initialActive: unknown = active) {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60000 } },
  });
  cache.setQueryData(['active-detail', 'driver', 'ride'], initialActive);
  cache.setQueryData(['ride-context', 'driver', 'ride'], history);
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>{screen}</ThemeProvider>
      </QueryClientProvider>,
    );
  });
}
function button(title: string) {
  return tree.root
    .findAllByType(Button)
    .find(node => node.props.title === title)!;
}
test('keeps the route visible while exposing and confirming the next passenger dropoff', async () => {
  await mount(<TrackingScreen />);
  expect(JSON.stringify(tree.toJSON())).toContain('Bajan: Ana');
  expect(tree.root.findByType(RoutePreviewMap).props.encodedPolyline).toBe(
    'operative',
  );
  const map = tree.root.findByType(RoutePreviewMap);
  const initialInset = map.props.viewportInsets.bottom;
  await act(() => button('Ver pasajeros y acciones').props.onPress());
  expect(tree.root.findByType(RoutePreviewMap)).toBe(map);
  expect(map.props.viewportInsets.bottom).toBeGreaterThan(initialInset);
  await act(async () => button('Confirmar bajada de Ana').props.onPress());
  expect(pilotApi.attend).toHaveBeenCalledWith('ride', 'booking', 'dropoff');
  expect(mockRefresh).toHaveBeenCalled();
});
test('a rapid double tap confirms a passenger action only once', async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(pilotApi.attend).mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  await mount(<TrackingScreen />);
  const confirm = button('Confirmar bajada de Ana');
  await act(() => {
    confirm.props.onPress();
    confirm.props.onPress();
  });
  expect(pilotApi.attend).toHaveBeenCalledTimes(1);
  await act(async () => resolve(undefined));
});
test('does not display a current ETA or animate a stale vehicle', async () => {
  mockState = 'stale';
  await mount(<TrackingScreen />);
  expect(tree.root.findByType(RoutePreviewMap).props.vehicle.stale).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Sin actualización');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Llegada a la parada');
});
test('keeps a permission failure visible until GPS actually resumes', async () => {
  jest
    .mocked(pilotTracking.start)
    .mockRejectedValueOnce(new Error('Permite la ubicación precisa'));
  await mount(<TrackingScreen />);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Permite la ubicación precisa',
  );
  await act(async () => button('Reanudar GPS').props.onPress());
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Permite la ubicación precisa',
  );
});

test('incomplete active data stays on a recoverable retry screen', async () => {
  await mount(<TrackingScreen />, { role: 'conductor', ride: null });
  expect(JSON.stringify(tree.toJSON())).toContain('No pudimos cargar el viaje');
  expect(tree.root.findAllByType(RoutePreviewMap)).toHaveLength(0);
});

test('leaving tracking cancels pending startup without stopping an already running trip', async () => {
  await mount(<TrackingScreen />);
  await act(() => tree.unmount());
  expect(pilotTracking.cancelStart).toHaveBeenCalledWith('ride');
  expect(pilotTracking.stop).not.toHaveBeenCalled();
});
test('does not start the trip when precise location preparation fails', async () => {
  jest
    .mocked(pilotTracking.prepare)
    .mockRejectedValueOnce(new Error('Permite la ubicación precisa'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount(<ScheduledScreen />);
  await act(() => button('Comenzar viaje').props.onPress());
  const actions = alert.mock.calls[0][2]!;
  await act(async () =>
    actions.find(action => action.text === 'Comenzar')!.onPress?.(),
  );
  expect(pilotTracking.prepare).toHaveBeenCalledTimes(1);
  expect(rideApi.start).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Permite la ubicación precisa',
  );
});
test('requires resolving pending requests before beginning the trip', async () => {
  history.bookings = [
    {
      bookingId: 'booking',
      status: 'pending',
      name: 'Ana',
      amountCents: 1234,
      cashStatus: 'pending',
      pickupAddress: 'Encuentro',
      dropoffAddress: 'Biblioteca',
      pickupOrder: 1,
      dropoffOrder: 2,
      myReview: null,
    },
  ];
  await mount(<ScheduledScreen />);
  expect(button('Comenzar viaje').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Acepta o rechaza las solicitudes',
  );
  expect(pilotTracking.prepare).not.toHaveBeenCalled();
});
test('a cancelled reservation never presents boarding or dropoff as completed milestones', async () => {
  await mount(<ReservationProgress status="cancelled" />);
  const output = JSON.stringify(tree.toJSON());
  expect(output).toContain('Esta reserva se canceló');
  expect(output).not.toContain('Descenso confirmado');
  expect(output).not.toContain('Subida confirmada');
});

test('a new reservation stays scheduled after an earlier cancellation on the same trip', async () => {
  history.role = 'passenger';
  const booking = {
    bookingId: 'old-booking',
    status: 'cancelled',
    name: 'Ana',
    amountCents: 1234,
    cashStatus: 'void',
    pickupAddress: 'Old pickup',
    dropoffAddress: 'Old dropoff',
    pickupOrder: 1,
    dropoffOrder: 2,
    myReview: null,
  };
  history.bookings = [
    booking,
    {
      ...booking,
      bookingId: 'new-booking',
      status: 'confirmed',
      pickupAddress: 'Nuevo encuentro',
      cashStatus: 'pending',
    },
  ];
  await mount(<ScheduledScreen />);
  expect(mockNavigation.replace).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Nuevo encuentro');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Old pickup');
});

test('leaving during finalization never redirects the user after the request resolves', async () => {
  let resolve!: () => void;
  jest.mocked(rideApi.complete).mockReturnValueOnce(
    new Promise(done => {
      resolve = () => done(undefined as never);
    }),
  );
  mockSnapshot.canComplete = true;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount(<TrackingScreen />);
  await act(() => button('Finalizar viaje').props.onPress());
  const confirm = alert.mock.calls[0][2]!.find(
    action => action.text === 'Finalizar',
  )!;
  await act(() => confirm.onPress?.());
  expect(rideApi.complete).toHaveBeenCalledTimes(1);
  await act(() => tree.unmount());
  await act(async () => resolve());
  expect(pilotTracking.stop).toHaveBeenCalledWith('ride');
  expect(mockNavigation.replace).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
});

test('a completed trip update in an unfocused screen does not replace the current screen', async () => {
  mockFocused = false;
  history.ride.status = 'completed';
  await mount(<ScheduledScreen />);
  expect(mockNavigation.replace).not.toHaveBeenCalled();
});

test('leaving during the GPS permission prompt cancels the trip start', async () => {
  let resolve!: () => void;
  jest.mocked(pilotTracking.prepare).mockReturnValueOnce(
    new Promise(done => {
      resolve = () => done();
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount(<ScheduledScreen />);
  await act(() => button('Comenzar viaje').props.onPress());
  const confirm = alert.mock.calls[0][2]!.find(
    action => action.text === 'Comenzar',
  )!;
  await act(() => confirm.onPress?.());
  await act(() => tree.unmount());
  await act(async () => resolve());
  expect(rideApi.start).not.toHaveBeenCalled();
  expect(mockNavigation.replace).not.toHaveBeenCalled();
});
