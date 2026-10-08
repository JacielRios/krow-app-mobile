import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button, Input } from '../src/shared/components/ui-v2';
import { PlacePicker, RoutePreviewMap } from '../src/features/maps';
import { routeApi } from '../src/features/ride/api/routeApi';
import { PublishRideScreen } from '../src/features/ride/screens/driver/PublishRideScreen';
import { RideDateTimePicker } from '../src/features/ride/components/RideDateTimePicker';
import { RideComfortControls } from '../src/features/ride/components/RideComfortControls';
import { VehiclePicker } from '../src/features/ride/components/VehiclePicker';
import { rideApi } from '../src/features/ride/api/rideApi';
import type { FavoriteRoute, RideDetail } from '../src/features/ride/types';
import { CAMPUS_ORIGIN } from '../src/features/ride/domain/driverRideRules';
import { RideOriginSummary } from '../src/features/ride/components/RideOriginSummary';

const mockNavigation = {
  replace: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};
let mockParams: {
  favoriteRouteId?: string;
  favoriteOnly?: boolean;
  editRideId?: string;
} = {};
let mockRide: RideDetail | null = null;
let mockFavorites: FavoriteRoute[] = [];
const mockCreateFavorite = jest.fn();
const mockUpdateFavorite = jest.fn();
const mockStops = ['a', 'b', 'c'].map((stopId, index) => ({
  stopId,
  externalId: stopId,
  name: `Parada ${stopId}`,
  address: stopId,
  municipality: null,
  location: { lat: 25.67 + index / 100, lng: -100.3 },
  distanceFromRouteMeters: 1,
  routeFraction: index / 2,
}));
const mockCorridors = ['avenue-one', 'avenue-two'].map(corridorId => ({
  corridorId,
  name: corridorId === 'avenue-one' ? 'Avenida del catálogo' : 'Otra avenida',
  code: corridorId,
  direction: 'Salida del campus',
  stops: [],
}));
let mockRouteError: string | null = null;
const mockDirectionsRequest = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
  usePreventRemove: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({
    user: { userId: 'driver', role: 'conductor', canPublishRides: true },
    loading: false,
  }),
}));
jest.mock('../src/features/maps', () => ({
  PlacePicker: () => null,
  RoutePreviewMap: () => null,
  useDirections: (
    _origin: unknown,
    destination: unknown,
    options: {
      departureTime?: Date;
      corridorId?: string;
      transportStopIds?: string[];
    },
  ) => {
    const ReactModule = require('react');
    const directions = ReactModule.useMemo(
      () =>
        destination && !mockRouteError
          ? {
              encodedPolyline: 'test',
              distanceMeters: 1000,
              durationSeconds: 600,
              compatibleStops: mockStops,
            }
          : null,
      [
        destination,
        options.departureTime,
        options.corridorId,
        options.transportStopIds?.join(','),
        mockRouteError,
      ],
    );
    mockDirectionsRequest(destination, options);
    return {
      directions,
      loading: false,
      error: destination ? mockRouteError : null,
      fetch: jest.fn(),
    };
  },
}));
jest.mock('../src/features/ride/hooks', () => ({
  usePublishRide: jest.requireActual(
    '../src/features/ride/hooks/usePublishRide',
  ).usePublishRide,
  useDriverVehicles: () => ({
    vehicles: [
      { vehicle_id: 'vehicle', brand: 'Auto', model: 'Piloto', capacity: 5 },
    ],
    loading: false,
    error: null,
  }),
  useFavoriteRoutes: () => ({
    favorites: mockFavorites,
    createFavorite: mockCreateFavorite,
    updateFavorite: mockUpdateFavorite,
    saving: false,
  }),
  useRideDetail: () => ({ ride: mockRide, loading: false, error: null }),
}));
jest.mock('../src/features/ride/api/rideApi', () => ({
  rideApi: { create: jest.fn() },
}));
jest.mock('../src/features/ride/api/routeApi', () => ({
  routeApi: { corridors: jest.fn() },
}));

let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockFavorites = [];
  mockRide = null;
  mockRouteError = null;
  jest.mocked(routeApi.corridors).mockResolvedValue(mockCorridors);
  jest.mocked(rideApi.create).mockResolvedValue({ rideId: 'ride' });
  mockCreateFavorite.mockResolvedValue({ routeId: 'saved-favorite' });
  mockUpdateFavorite.mockResolvedValue({ routeId: 'saved-favorite' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache?.clear();
  jest.restoreAllMocks();
});
async function mount() {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <PublishRideScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
}
function button(title: string) {
  return tree.root
    .findAllByType(Button)
    .find(node => node.props.title === title)!;
}
async function fillDetails() {
  await act(() => button('Continuar').props.onPress());
  await act(() =>
    tree.root.findByType(VehiclePicker).props.onSelect('vehicle'),
  );
  await act(() =>
    tree.root
      .findByType(RideDateTimePicker)
      .props.onChange(new Date(Date.now() + 3600000)),
  );
  await act(() =>
    tree.root.findByType(RideComfortControls).props.onSeatsChange('2'),
  );
  await act(() =>
    tree.root.findByType(RideComfortControls).props.onPriceChange('12.34'),
  );
}
async function chooseDestination() {
  await act(() =>
    tree.root.findByType(PlacePicker).props.onChange({
      address: 'Destino',
      placeId: 'd',
      location: { lat: 25.69, lng: -100.3 },
    }),
  );
  await selectCorridor();
  await selectStop('a');
  await selectStop('c');
}
async function selectCorridor(index = 0) {
  await act(() =>
    tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel ===
          `Avenida: ${mockCorridors[index].name}`,
      )[0]
      .props.onPress(),
  );
}
async function selectStop(stopId: string) {
  await act(() =>
    tree.root
      .findByType(RoutePreviewMap)
      .props.extraMarkers.find((marker: { id: string }) => marker.id === stopId)
      .onPress(),
  );
}
test('repeated taps publish once and keep the committed favorite when publication fails', async () => {
  let resolve!: (value: { rideId: string }) => void;
  jest.mocked(rideApi.create).mockRejectedValueOnce(new Error('Sin red'));
  await mount();
  await chooseDestination();
  await fillDetails();
  await act(() =>
    tree.root
      .findAll(node => node.props.accessibilityRole === 'checkbox')[0]
      .props.onPress(),
  );
  await act(() =>
    tree.root
      .findAllByType(Input)
      .find(node => node.props.label === 'Nombre de la ruta')!
      .props.onChangeText('Campus'),
  );
  await act(() => button('Continuar').props.onPress());
  await act(async () => button('Publicar viaje').props.onPress());
  expect(mockCreateFavorite).toHaveBeenCalledTimes(1);
  expect(mockNavigation.replace).not.toHaveBeenCalled();
  jest.mocked(rideApi.create).mockReturnValueOnce(
    new Promise(yes => {
      resolve = yes;
    }),
  );
  const submit = button('Publicar viaje').props.onPress;
  await act(async () => {
    submit();
    submit();
  });
  expect(mockCreateFavorite).toHaveBeenCalledTimes(1);
  expect(mockUpdateFavorite).toHaveBeenCalledWith(
    expect.objectContaining({ routeId: 'saved-favorite' }),
  );
  expect(rideApi.create).toHaveBeenCalledTimes(2);
  await act(async () => resolve({ rideId: 'ride' }));
  expect(mockNavigation.replace).toHaveBeenCalledWith('RideScheduled', {
    rideId: 'ride',
  });
});
test('recalculating a favorite preserves its corridor and only its selected catalog stops', async () => {
  mockParams = { favoriteRouteId: 'favorite' };
  mockFavorites = [
    {
      routeId: 'favorite',
      name: 'Campus',
      corridorId: 'avenue-one',
      origin: { address: 'Origen', lat: 25.67, lng: -100.3 },
      destination: { address: 'Destino', lat: 25.69, lng: -100.3 },
      defaults: {
        vehicleId: 'vehicle',
        availableSeats: 2,
        pricePerSeatCents: 1234,
      },
      stops: ['a', 'c'].map((stopId, index) => ({
        stopId,
        transportStopId: stopId,
        externalId: stopId,
        stopOrder: index,
        routeFraction: index,
        name: stopId,
        address: stopId,
        municipality: null,
        location: mockStops[index].location,
        active: true,
      })),
      hasStaleStops: false,
      createdAt: '',
      updatedAt: '',
    },
  ];
  await mount();
  await fillDetails();
  await act(() => button('Continuar').props.onPress());
  await act(async () => button('Publicar viaje').props.onPress());
  expect(rideApi.create).toHaveBeenCalledWith(
    expect.objectContaining({
      transport_stop_ids: ['a', 'c'],
      corridor_id: 'avenue-one',
      price_per_seat: 12.34,
      origin_lat: CAMPUS_ORIGIN.location.lat,
      origin_lng: CAMPUS_ORIGIN.location.lng,
      origin_address: CAMPUS_ORIGIN.address,
    }),
  );
});

test('new rides show a fixed campus origin and only ask for a destination', async () => {
  await mount();
  expect(tree.root.findAllByType(PlacePicker)).toHaveLength(1);
  expect(tree.root.findByType(PlacePicker).props.label).toBe('Destino');
  expect(tree.root.findByType(RideOriginSummary).props.origin).toEqual(
    CAMPUS_ORIGIN,
  );
});

test('selecting a stop on the map also checks its numbered list row', async () => {
  await mount();
  await chooseDestination();
  const marker = tree.root.findByType(RoutePreviewMap).props.extraMarkers[1];
  expect(marker.label).toBe('2');
  await act(() => marker.onPress());
  expect(
    tree.root.findByType(RoutePreviewMap).props.extraMarkers[1].selected,
  ).toBe(true);
  const row = tree.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Parada 2: Parada b. Seleccionada',
  )[0];
  expect(row.props.accessibilityState.checked).toBe(true);
});

test('a new route needs an avenue and explicit stop selection; compatible stops are not auto-selected', async () => {
  await mount();
  await act(() =>
    tree.root.findByType(PlacePicker).props.onChange({
      address: 'Destino',
      placeId: 'd',
      location: { lat: 25.69, lng: -100.3 },
    }),
  );
  await act(() => button('Continuar').props.onPress());
  expect(tree.root.findAllByType(VehiclePicker)).toHaveLength(0);
  await selectCorridor();
  expect(
    tree.root
      .findByType(RoutePreviewMap)
      .props.extraMarkers.every(
        (marker: { selected: boolean }) => !marker.selected,
      ),
  ).toBe(true);
  await act(() => button('Continuar').props.onPress());
  expect(tree.root.findAllByType(VehiclePicker)).toHaveLength(0);
  await selectStop('b');
  await fillDetails();
  await act(() => button('Continuar').props.onPress());
  expect(mockDirectionsRequest).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({
      corridorId: 'avenue-one',
      transportStopIds: ['b'],
    }),
  );
  await act(async () => button('Publicar viaje').props.onPress());
  expect(rideApi.create).toHaveBeenCalledWith(
    expect.objectContaining({
      corridor_id: 'avenue-one',
      transport_stop_ids: ['b'],
    }),
  );
});

test('changing the avenue clears the prior selection and never silently enables other stops', async () => {
  await mount();
  await chooseDestination();
  await selectCorridor(1);
  expect(
    tree.root
      .findByType(RoutePreviewMap)
      .props.extraMarkers.every(
        (marker: { selected: boolean }) => !marker.selected,
      ),
  ).toBe(true);
  await act(() => button('Continuar').props.onPress());
  expect(tree.root.findAllByType(VehiclePicker)).toHaveLength(0);
});

test('an unavailable corridor catalog keeps publication blocked and offers a retry', async () => {
  jest.mocked(routeApi.corridors).mockRejectedValue(new Error('Sin conexión'));
  await mount();
  await act(() =>
    tree.root.findByType(PlacePicker).props.onChange({
      address: 'Destino',
      placeId: 'd',
      location: { lat: 25.69, lng: -100.3 },
    }),
  );
  await act(() => button('Continuar').props.onPress());
  expect(tree.root.findAllByType(VehiclePicker)).toHaveLength(0);
  expect(rideApi.create).not.toHaveBeenCalled();
  expect(
    tree.root.findAll(
      node => node.props.title === 'No pudimos cargar las avenidas',
    ),
  ).not.toHaveLength(0);
});

test('a route service failure is shown without enabling publication', async () => {
  mockRouteError = 'No pudimos calcular la ruta';
  await mount();
  await act(() =>
    tree.root.findByType(PlacePicker).props.onChange({
      address: 'Destino',
      placeId: 'd',
      location: { lat: 25.69, lng: -100.3 },
    }),
  );
  await selectCorridor();
  await act(() => button('Continuar').props.onPress());
  expect(tree.root.findAllByType(VehiclePicker)).toHaveLength(0);
  expect(rideApi.create).not.toHaveBeenCalled();
  expect(
    tree.root.findAll(
      node => node.props.title === 'No pudimos calcular el recorrido',
    ),
  ).not.toHaveLength(0);
});

test('editing a historical ride keeps its real origin visible', async () => {
  mockParams = { editRideId: 'historical' };
  mockRide = {
    rideId: 'historical',
    favoriteRouteId: null,
    origin: { address: 'Salida histórica', lat: 25.7, lng: -100.3 },
    destination: { address: 'Destino', lat: 25.69, lng: -100.3 },
    routePolyline: null,
    routeDistanceMeters: null,
    routeDurationSeconds: null,
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    availableSeats: 2,
    pricePerSeatCents: 1234,
    status: 'scheduled',
    version: 1,
    vehicle: null,
    stops: [],
    canEdit: true,
    editBlockReason: null,
  };
  await mount();
  expect(tree.root.findByType(RideOriginSummary).props.origin).toEqual({
    address: 'Salida histórica',
    placeId: '',
    location: { lat: 25.7, lng: -100.3 },
  });
  expect(tree.root.findAllByType(PlacePicker)).toHaveLength(1);
});
