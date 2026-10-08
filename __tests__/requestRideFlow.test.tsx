import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, PermissionsAndroid } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button } from '../src/shared/components/ui-v2';
import { RequestRideScreen } from '../src/features/ride/screens/passenger/RequestRideScreen';
import { PlacePicker, RoutePreviewMap } from '../src/features/maps';
import { RideCard } from '../src/features/ride/components/RideCard';
import { rideApi } from '../src/features/ride/api/rideApi';
import { bookingApi } from '../src/features/ride/api/bookingApi';
import { CAMPUS_ORIGIN } from '../src/features/ride/domain/driverRideRules';
import type {
  AvailableRide,
  RideStopOptions,
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
  rideApi: {
    stopCandidates: jest.fn(),
    search: jest.fn(),
    stopOptions: jest.fn(),
  },
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
const options: RideStopOptions = {
  pairs: [300, 800, 4800].map((distanceMeters, index) => ({
    pickup: ride.bestPickupStop,
    dropoff: {
      ...ride.bestDropoffStop,
      stopId: ['dropoff-ride', 'middle-ride', 'far-ride'][index],
      name: ['Descenso cercano', 'Descenso intermedio', 'Descenso preferido'][
        index
      ],
      distanceMeters,
    },
  })),
  recommendedDropoffStopId: 'dropoff-ride',
  radiusMeters: 3000,
};
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(rideApi.stopOptions).mockResolvedValue(options);
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
}
test('searches from destination directly and reserves with automatic campus boarding', async () => {
  const permission = jest.spyOn(PermissionsAndroid, 'request');
  await mount();
  expect(permission).not.toHaveBeenCalled();
  expect(rideApi.search).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(PlacePicker)).toHaveLength(1);
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  expect(rideApi.stopCandidates).not.toHaveBeenCalled();
  expect(rideApi.search).toHaveBeenCalledWith({
    maxResults: 50,
    destination: destination.location,
  });
  expect(rideApi.stopOptions).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
  expect(rideApi.stopOptions).toHaveBeenCalledWith(
    'ride',
    CAMPUS_ORIGIN.location,
    destination.location,
  );
  expect(
    tree.root
      .findByType(RoutePreviewMap)
      .props.extraMarkers.map((marker: { id: string }) => marker.id),
  ).toEqual([
    'campus-pickup',
    'requested-destination',
    'dropoff-dropoff-ride',
    'dropoff-middle-ride',
    'dropoff-far-ride',
  ]);
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

test('retains results on a failed refresh and allows retrying trip stop discovery', async () => {
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  jest.mocked(rideApi.search).mockRejectedValueOnce(new Error('Sin red'));
  const refresh = tree.root.findAll(
    node => node.props.refreshControl != null,
  )[0].props.refreshControl;
  await act(async () => refresh.props.onRefresh());
  expect(tree.root.findAllByType(RideCard)).toHaveLength(1);
  jest.mocked(rideApi.stopOptions).mockRejectedValueOnce(new Error('Sin red'));
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
  expect(button('Solicitar unirse').props.disabled).toBe(true);
  await act(async () => button('Reintentar paradas').props.onPress());
  expect(rideApi.stopOptions).toHaveBeenCalledTimes(2);
  expect(button('Solicitar unirse').props.disabled).toBe(false);
});

test('cannot submit while existing reservations could not be checked', async () => {
  jest.mocked(bookingApi.activeRideIds).mockRejectedValue(new Error('Sin red'));
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
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
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
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
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
  await act(async () => {
    button('Solicitar unirse').props.onPress();
  });
  await act(() => tree.unmount());
  await act(async () => resolve({ bookingId: 'booking' }));
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});

test('keeps server proximity ranking at 300 m, 800 m and 1.5 km despite different departure times', async () => {
  jest.mocked(rideApi.search).mockResolvedValue(
    [300, 800, 1500].map((distance, index) => ({
      ...ride,
      rideId: 'ride-' + index,
      departureTime: [
        '2026-10-07T18:00:00Z',
        '2026-10-07T17:00:00Z',
        '2026-10-07T16:00:00Z',
      ][index],
      bestDropoffStop: { ...ride.bestDropoffStop, distanceMeters: distance },
      match: { ...ride.match, dropoffDistanceMeters: distance },
    })),
  );
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  expect(
    tree.root
      .findAllByType(RideCard)
      .map(card => card.props.ride.match.dropoffDistanceMeters),
  ).toEqual([300, 800, 1500]);
});

test('a passenger can choose an enabled 4.8 km drop-off beyond the matching radius from the map', async () => {
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
  const marker = tree.root
    .findByType(RoutePreviewMap)
    .props.extraMarkers.find(
      (item: { id: string }) => item.id === 'dropoff-far-ride',
    );
  await act(() => marker.onPress());
  expect(button('Solicitar unirse').props.disabled).toBe(false);
  await act(async () => button('Solicitar unirse').props.onPress());
  expect(bookingApi.request).toHaveBeenCalledWith(
    'ride',
    'pickup-ride',
    'far-ride',
    1,
  );
});

test('ignores stop responses from a previously opened trip', async () => {
  let resolve!: (value: RideStopOptions) => void;
  jest
    .mocked(rideApi.search)
    .mockResolvedValue([ride, { ...ride, rideId: 'second' }]);
  jest.mocked(rideApi.stopOptions).mockReturnValueOnce(
    new Promise(yes => {
      resolve = yes;
    }),
  );
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(async () => tree.root.findAllByType(RideCard)[0].props.onRequest());
  await act(() => button('Cerrar').props.onPress());
  await act(async () => tree.root.findAllByType(RideCard)[1].props.onRequest());
  await act(async () =>
    resolve({ ...options, pairs: [], recommendedDropoffStopId: null }),
  );
  await act(async () => button('Solicitar unirse').props.onPress());
  expect(bookingApi.request).toHaveBeenCalledWith(
    'second',
    'pickup-ride',
    'dropoff-ride',
    1,
  );
});

test('changing destination ignores an older pending search response', async () => {
  let resolve!: (value: AvailableRide[]) => void;
  jest
    .mocked(rideApi.search)
    .mockReturnValueOnce(
      new Promise(yes => {
        resolve = yes;
      }),
    )
    .mockResolvedValueOnce([{ ...ride, rideId: 'new-destination' }]);
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(() => button('Cambiar destino').props.onPress());
  await act(() =>
    tree.root.findByType(PlacePicker).props.onChange({
      ...destination,
      location: { lat: 25.68, lng: -100.19 },
    }),
  );
  await act(async () => button('Buscar viajes').props.onPress());
  await act(async () => resolve([ride]));
  expect(
    tree.root.findAllByType(RideCard).map(card => card.props.ride.rideId),
  ).toEqual(['new-destination']);
});

test('a concurrent last-seat rejection reloads availability and never opens a reservation', async () => {
  await mount();
  await chooseRoute();
  await act(async () => button('Buscar viajes').props.onPress());
  await act(async () => tree.root.findByType(RideCard).props.onRequest());
  jest
    .mocked(bookingApi.request)
    .mockRejectedValueOnce(new Error('El último asiento ya fue reservado.'));
  jest.mocked(rideApi.search).mockResolvedValueOnce([]);
  await act(async () => button('Solicitar unirse').props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith(
    'No se pudo solicitar',
    'El último asiento ya fue reservado.',
  );
  expect(rideApi.search).toHaveBeenCalledTimes(2);
  expect(tree.root.findAllByType(RideCard)).toHaveLength(0);
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
