import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { PermissionsAndroid } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button } from '../src/shared/components/ui-v2';
import { RequestRideScreen } from '../src/features/ride/screens/passenger/RequestRideScreen';
import { PlacePicker } from '../src/features/maps';
import { RideCard } from '../src/features/ride/components/RideCard';
import { rideApi } from '../src/features/ride/api/rideApi';
import { bookingApi } from '../src/features/ride/api/bookingApi';
import { CAMPUS_ORIGIN } from '../src/features/ride/domain/driverRideRules';
import type {
  AvailableRide,
  PassengerStopCandidates,
} from '../src/features/ride/types/rideSearch.types';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('react-native-config', () => ({ KROW_PILOT_ENABLED: 'true' }));
jest.mock('../src/features/maps', () => ({
  PlacePicker: () => null,
  RoutePreviewMap: () => null,
  useReverseGeocode: () => ({ resolve: jest.fn() }),
}));
jest.mock('../src/features/ride/hooks', () => ({
  useSearchRides: jest.requireActual(
    '../src/features/ride/hooks/useSearchRides',
  ).useSearchRides,
  useRequestBooking: jest.requireActual(
    '../src/features/ride/hooks/useRequestBooking',
  ).useRequestBooking,
}));
jest.mock('../src/features/ride/api/rideApi', () => ({
  rideApi: { stopCandidates: jest.fn(), search: jest.fn() },
}));
jest.mock('../src/features/ride/api/bookingApi', () => ({
  bookingApi: { activeRideIds: jest.fn(), request: jest.fn() },
}));

const origin = {
  address: 'Origen solicitado',
  placeId: 'origin',
  location: { lat: 25.67, lng: -100.3 },
};
const destination = {
  address: 'Destino solicitado',
  placeId: 'destination',
  location: { lat: 25.68, lng: -100.31 },
};
const candidates: PassengerStopCandidates = {
  radiusMeters: 1000,
  pickupStops: [
    {
      role: 'pickup',
      stopId: 'pickup-catalog',
      externalId: 'p',
      name: 'Encuentro real',
      address: 'Parada subida',
      municipality: null,
      stopType: 'general',
      location: origin.location,
      distanceMeters: 75,
      enabled: true,
      rideCount: 1,
    },
  ],
  dropoffStops: [
    {
      role: 'dropoff',
      stopId: 'dropoff-catalog',
      externalId: 'd',
      name: 'Descenso real',
      address: 'Parada bajada',
      municipality: null,
      stopType: 'general',
      location: destination.location,
      distanceMeters: 90,
      enabled: true,
      rideCount: 1,
    },
  ],
  pairs: [
    {
      pickupStopId: 'pickup-catalog',
      dropoffStopId: 'dropoff-catalog',
      rideCount: 1,
    },
  ],
};
const ride: AvailableRide = {
  rideId: 'ride',
  driverId: 'driver',
  driverName: 'Conductor de prueba',
  driverRating: null,
  vehicle: null,
  origin: origin.location,
  destination: destination.location,
  originAddress: origin.address,
  destinationAddress: destination.address,
  routePolyline: null,
  departureTime: '2026-10-07T15:00:00Z',
  availableSeats: 1,
  pricePerSeat: 12.34,
  status: 'scheduled',
  routeDistanceMeters: null,
  routeDurationSeconds: null,
  bestPickupStop: {
    stopId: 'pickup-ride',
    name: 'Encuentro real',
    address: 'Parada subida',
    location: origin.location,
    distanceMeters: 75,
  },
  bestDropoffStop: {
    stopId: 'dropoff-ride',
    name: 'Descenso real',
    address: 'Parada bajada',
    location: destination.location,
    distanceMeters: 90,
  },
  match: { pickupDistanceMeters: 75, dropoffDistanceMeters: 90 },
};
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(rideApi.stopCandidates).mockResolvedValue(candidates);
  jest.mocked(rideApi.search).mockResolvedValue([ride]);
  jest.mocked(bookingApi.activeRideIds).mockResolvedValue([]);
  jest.mocked(bookingApi.request).mockResolvedValue({ bookingId: 'booking' });
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  cache?.clear();
  jest.restoreAllMocks();
});
async function mount() {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <RequestRideScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
}
function button(title: string) {
  const matches = tree.root
    .findAllByType(Button)
    .filter(node => node.props.title === title);
  return matches[matches.length - 1];
}
async function chooseRoute() {
  await act(async () =>
    tree.root.findByType(PlacePicker).props.onChange(destination),
  );
  await act(() => button('Elegir paradas').props.onPress());
}
test('searches through route and stops, submits ride stop IDs and opens the reservation', async () => {
  const permission = jest.spyOn(PermissionsAndroid, 'request');
  await mount();
  expect(permission).not.toHaveBeenCalled();
  expect(rideApi.search).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(PlacePicker)).toHaveLength(1);
  await chooseRoute();
  expect(rideApi.stopCandidates).toHaveBeenCalledWith(
    CAMPUS_ORIGIN.location,
    destination.location,
    { pickupScope: 'campus' },
  );
  await act(async () => button('Buscar viajes').props.onPress());
  expect(rideApi.search).toHaveBeenCalledWith(
    expect.objectContaining({
      pickupTransportStopId: 'pickup-catalog',
      dropoffTransportStopId: 'dropoff-catalog',
    }),
  );
  await act(() => tree.root.findByType(RideCard).props.onRequest());
  await act(async () => button('Solicitar unirse').props.onPress());
  expect(bookingApi.request).toHaveBeenCalledWith(
    'ride',
    'pickup-ride',
    'dropoff-ride',
    1,
  );
  expect(mockNavigation.navigate).toHaveBeenCalledWith('RideScheduled', {
    rideId: 'ride',
  });
});

test('chooses an intermediate catalog pickup without changing the trip campus origin', async () => {
  const intermediate = {
    ...candidates.pickupStops[0],
    stopId: 'intermediate',
    name: 'Parada intermedia',
    location: { lat: 25.7, lng: -100.3 },
  };
  jest
    .mocked(rideApi.stopCandidates)
    .mockResolvedValueOnce(candidates)
    .mockResolvedValueOnce({
      ...candidates,
      pickupStops: [intermediate],
      pairs: [
        {
          pickupStopId: 'intermediate',
          dropoffStopId: 'dropoff-catalog',
          rideCount: 1,
        },
      ],
    });
  await mount();
  await chooseRoute();
  await act(async () => button('Subir en otra parada').props.onPress());
  expect(rideApi.stopCandidates).toHaveBeenLastCalledWith(
    CAMPUS_ORIGIN.location,
    destination.location,
    { pickupScope: 'route' },
  );
  await act(async () => button('Buscar viajes').props.onPress());
  expect(rideApi.search).toHaveBeenCalledWith(
    expect.objectContaining({
      origin: intermediate.location,
      pickupTransportStopId: 'intermediate',
    }),
  );
});
test('retains results when refresh fails and allows retrying candidate discovery', async () => {
  jest
    .mocked(rideApi.stopCandidates)
    .mockRejectedValueOnce(new Error('Sin red'));
  await mount();
  await chooseRoute();
  await act(async () => button('Reintentar').props.onPress());
  expect(rideApi.stopCandidates).toHaveBeenCalledTimes(2);
  await act(async () => button('Buscar viajes').props.onPress());
  expect(tree.root.findAllByType(RideCard)).toHaveLength(1);
  jest.mocked(rideApi.search).mockRejectedValueOnce(new Error('Sin red'));
  const refresh = tree.root.findAll(
    node => node.props.refreshControl != null,
  )[0].props.refreshControl;
  await act(async () => refresh.props.onRefresh());
  expect(tree.root.findAllByType(RideCard)).toHaveLength(1);
});

test('cannot submit while existing reservations could not be checked', async () => {
  jest.mocked(bookingApi.activeRideIds).mockRejectedValue(new Error('Sin red'));
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(() => tree.root.findByType(RideCard).props.onRequest());
  expect(button('Solicitar unirse').props.disabled).toBe(true);
  await act(async () => button('Solicitar unirse').props.onPress());
  expect(bookingApi.request).not.toHaveBeenCalled();
});

test('a repeated tap does not send the same request twice', async () => {
  let resolve!: (value: { bookingId: string }) => void;
  jest.mocked(bookingApi.request).mockReturnValue(
    new Promise(yes => {
      resolve = yes;
    }),
  );
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(() => tree.root.findByType(RideCard).props.onRequest());
  const submit = button('Solicitar unirse').props.onPress;
  await act(() => {
    submit();
    submit();
  });
  expect(bookingApi.request).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ bookingId: 'booking' }));
});
test('a request finishing after leaving the screen does not reopen a reservation', async () => {
  let resolve!: (value: { bookingId: string }) => void;
  jest.mocked(bookingApi.request).mockReturnValue(
    new Promise(yes => {
      resolve = yes;
    }),
  );
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(() => tree.root.findByType(RideCard).props.onRequest());
  await act(async () => {
    button('Solicitar unirse').props.onPress();
  });
  await act(() => tree.unmount());
  await act(async () => resolve({ bookingId: 'booking' }));
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
