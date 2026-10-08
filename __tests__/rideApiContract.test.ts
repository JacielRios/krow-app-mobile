import { rideApi } from '../src/features/ride/api/rideApi';
import { apiRequest } from '../src/core/api/apiClient';
import { CAMPUS_ORIGIN } from '../src/features/ride/domain/driverRideRules';
import { routeApi } from '../src/features/ride/api/routeApi';
jest.mock('../src/core/api/apiClient', () => ({ apiRequest: jest.fn() }));

const point = { lat: 25.67, lng: -100.3 };
const pickup = {
  stopId: 'ride-pickup',
  name: 'Encuentro',
  address: null,
  location: point,
  distanceMeters: 75,
};
const dropoff = { ...pickup, stopId: 'ride-dropoff', name: 'Descenso' };
const result = {
  rideId: 'ride',
  driverId: 'driver',
  driverName: null,
  driverRating: null,
  vehicle: null,
  origin: point,
  destination: point,
  originAddress: null,
  destinationAddress: null,
  routePolyline: null,
  departureTime: '2026-10-07T15:00:00Z',
  availableSeats: 2,
  pricePerSeatCents: 1234,
  status: 'scheduled',
  routeDistanceMeters: null,
  routeDurationSeconds: null,
  bestPickupStop: pickup,
  bestDropoffStop: dropoff,
  match: { pickupDistanceMeters: 75, dropoffDistanceMeters: 75 },
};
const search = () =>
  rideApi.search({
    origin: point,
    destination: point,
    pickupTransportStopId: 'catalog-pickup',
    dropoffTransportStopId: 'catalog-dropoff',
  });
beforeEach(() => jest.clearAllMocks());
test('preserves cents and ride stop IDs while querying with catalog IDs', async () => {
  jest.mocked(apiRequest).mockResolvedValueOnce([result]);
  expect(await search()).toEqual([
    expect.objectContaining({
      pricePerSeat: 12.34,
      bestPickupStop: pickup,
      bestDropoffStop: dropoff,
    }),
  ]);
  expect(apiRequest).toHaveBeenCalledWith(
    '/rides/search',
    expect.objectContaining({
      body: expect.stringContaining('"pickupTransportStopId":"catalog-pickup"'),
    }),
  );
});
test.each([
  null,
  [null],
  [{ ...result, bestPickupStop: null }],
  [{ ...result, driverRating: '4.9' }],
  [{ ...result, origin: { lat: 100, lng: 0 } }],
])(
  'rejects incomplete search responses before rendering a trip: %p',
  async response => {
    jest.mocked(apiRequest).mockResolvedValueOnce(response);
    await expect(search()).rejects.toThrow('viajes disponibles');
  },
);

test('a new trip always sends the campus origin and edits preserve an existing origin', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ rideId: 'ride', version: 2 });
  const payload = {
    vehicle_id: 'vehicle',
    origin_lat: 25.7,
    origin_lng: -100.3,
    origin_address: 'Otra salida',
    destination_lat: 25.71,
    destination_lng: -100.31,
    transport_stop_ids: ['a', 'b'],
    departure_time: '2026-10-07T15:00:00Z',
    available_seats: 2,
    price_per_seat: 12.34,
  };
  await rideApi.create(payload);
  expect(
    JSON.parse(jest.mocked(apiRequest).mock.calls[0][1]!.body as string),
  ).toEqual(
    expect.objectContaining({
      origin: CAMPUS_ORIGIN.location,
      originAddress: CAMPUS_ORIGIN.address,
    }),
  );
  await rideApi.update('historical', 1, payload);
  expect(
    JSON.parse(jest.mocked(apiRequest).mock.calls[1][1]!.body as string),
  ).toEqual(
    expect.objectContaining({
      origin: { lat: 25.7, lng: -100.3 },
      originAddress: 'Otra salida',
    }),
  );
});

test('search defaults to the campus but keeps a selected intermediate pickup', async () => {
  jest.mocked(apiRequest).mockResolvedValue([]);
  await rideApi.search({ destination: point });
  expect(
    JSON.parse(jest.mocked(apiRequest).mock.calls[0][1]!.body as string).origin,
  ).toEqual(CAMPUS_ORIGIN.location);
  await search();
  expect(
    JSON.parse(jest.mocked(apiRequest).mock.calls[1][1]!.body as string).origin,
  ).toEqual(point);
});

test('destination search leaves the matching tolerance to the backend configuration', async () => {
  jest.mocked(apiRequest).mockResolvedValue([]);
  await rideApi.search({ destination: point });
  const body = JSON.parse(
    jest.mocked(apiRequest).mock.calls[0][1]!.body as string,
  );
  expect(body).not.toHaveProperty('maxDistanceMeters');
  expect(body).not.toHaveProperty('pickupTransportStopId');
  expect(body).not.toHaveProperty('dropoffTransportStopId');
  await rideApi.search({ destination: point, maxDistanceKm: 5 });
  expect(
    JSON.parse(jest.mocked(apiRequest).mock.calls[1][1]!.body as string)
      .maxDistanceMeters,
  ).toBe(5000);
});

test('keeps all available trip stops including a drop-off beyond the matching radius', async () => {
  const farther = { ...dropoff, stopId: 'farther', distanceMeters: 4800 };
  const options = {
    pairs: [
      { pickup, dropoff },
      { pickup, dropoff: farther },
    ],
    recommendedDropoffStopId: dropoff.stopId,
    radiusMeters: 3000,
  };
  jest.mocked(apiRequest).mockResolvedValue(options);
  expect(
    await rideApi.stopOptions('ride', CAMPUS_ORIGIN.location, point),
  ).toEqual(options);
  const body = JSON.parse(
    jest.mocked(apiRequest).mock.calls[0][1]!.body as string,
  );
  expect(body).not.toHaveProperty('maxDistanceMeters');
});

test.each([
  null,
  { pairs: null, radiusMeters: 3000 },
  {
    pairs: [
      { pickup, dropoff: { ...dropoff, location: { lat: 100, lng: 0 } } },
    ],
    radiusMeters: 3000,
  },
  {
    pairs: [{ pickup, dropoff }],
    recommendedDropoffStopId: 'missing',
    radiusMeters: 3000,
  },
  {
    pairs: [{ pickup, dropoff }],
    recommendedDropoffStopId: dropoff.stopId,
    radiusMeters: 0,
  },
])(
  'rejects invalid available stops before handing coordinates to the native map: %p',
  async response => {
    jest.mocked(apiRequest).mockResolvedValue(response);
    await expect(rideApi.stopOptions('ride', point, point)).rejects.toThrow(
      'paradas disponibles',
    );
  },
);

test('saving a favorite normalizes its origin without mutating the selected template', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ routeId: 'favorite' });
  const payload = {
    name: 'Mi ruta',
    origin: { address: 'Otra salida', ...point },
    destination: { address: 'Destino', ...point },
    transportStopIds: ['a', 'b'],
    corridorId: 'corridor',
  };
  await routeApi.createFavorite(payload);
  await routeApi.updateFavorite('favorite', payload);
  for (const [, options] of jest.mocked(apiRequest).mock.calls) {
    expect(JSON.parse(options!.body as string).origin).toEqual({
      address: CAMPUS_ORIGIN.address,
      placeId: CAMPUS_ORIGIN.placeId,
      ...CAMPUS_ORIGIN.location,
    });
  }
  expect(payload.origin.address).toBe('Otra salida');
});
test.each([
  null,
  { pickupStops: null, dropoffStops: [], pairs: [] },
  {
    pickupStops: [],
    dropoffStops: [],
    pairs: [{ pickupStopId: 'missing', dropoffStopId: 'missing' }],
  },
])(
  'rejects invalid candidate pairs before choosing pickup/dropoff: %p',
  async response => {
    jest.mocked(apiRequest).mockResolvedValueOnce(response);
    await expect(rideApi.stopCandidates(point, point)).rejects.toThrow(
      'paradas cercanas',
    );
  },
);
