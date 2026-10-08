import { routeApi } from '../src/features/ride/api/routeApi';
import { apiRequest } from '../src/core/api/apiClient';
import { CAMPUS_ORIGIN } from '../src/features/ride/domain/driverRideRules';

jest.mock('../src/core/api/apiClient', () => ({ apiRequest: jest.fn() }));

const corridor = {
  corridorId: 'avenue',
  name: 'Avenida del catálogo',
  code: 'avenue',
  direction: 'Salida del campus',
  stops: [
    {
      stopId: 'stop',
      externalId: 'reference',
      name: 'Parada de descenso',
      address: null,
      municipality: 'Guadalupe',
      location: { lat: 25.68, lng: -100.2 },
      direction: 'Oriente',
      active: true,
      stopOrder: 1,
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

test('loads avenues and their structured stop catalog from the server', async () => {
  jest.mocked(apiRequest).mockResolvedValue([corridor]);
  expect(await routeApi.corridors()).toEqual([corridor]);
  expect(apiRequest).toHaveBeenCalledWith('/routes/corridors');
});

test.each([
  null,
  {},
  [null],
  [{ ...corridor, stops: null }],
  [{ ...corridor, stops: [{ ...corridor.stops[0], location: null }] }],
  [
    {
      ...corridor,
      stops: [{ ...corridor.stops[0], location: { lat: 200, lng: 0 } }],
    },
  ],
])(
  'rejects invalid catalog data before it can reach the native map: %p',
  async response => {
    jest.mocked(apiRequest).mockResolvedValue(response);
    await expect(routeApi.corridors()).rejects.toThrow('avenidas del piloto');
  },
);

test('a favorite persists the avenue and only the chosen stops, with optional vehicle defaults', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ routeId: 'favorite' });
  const payload = {
    name: 'Casa',
    corridorId: corridor.corridorId,
    origin: { address: 'Otra salida', lat: 1, lng: 1 },
    destination: { address: 'Casa', lat: 25.69, lng: -100.2 },
    transportStopIds: ['selected-one'],
  };
  await routeApi.createFavorite(payload);
  await routeApi.updateFavorite('favorite', payload);
  for (const [, options] of jest.mocked(apiRequest).mock.calls) {
    expect(JSON.parse(options!.body as string)).toEqual(
      expect.objectContaining({
        corridorId: 'avenue',
        transportStopIds: ['selected-one'],
        origin: {
          address: CAMPUS_ORIGIN.address,
          placeId: CAMPUS_ORIGIN.placeId,
          ...CAMPUS_ORIGIN.location,
        },
      }),
    );
    expect(
      JSON.parse(options!.body as string).defaultVehicleId,
    ).toBeUndefined();
  }
  expect(payload.origin.address).toBe('Otra salida');
});
