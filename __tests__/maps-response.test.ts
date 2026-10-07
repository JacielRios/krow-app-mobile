import {
  searchPlaces,
  getPlaceDetails,
  getDirections,
  decodePolyline,
  reverseGeocode,
} from '../src/features/maps/api/mapsApi';
import { apiRequest } from '../src/core/api/apiClient';
jest.mock('../src/core/api/apiClient', () => ({
  apiRequest: jest.fn(),
  apiQuery: jest.fn(() => 'query=test'),
}));

test.each([null, {}, [null], [{ placeId: 'x' }]])(
  'rejects malformed suggestions before rendering them: %p',
  async response => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(response);
    await expect(searchPlaces('Monterrey')).rejects.toThrow('direcciones');
  },
);
test.each([
  null,
  {},
  { encodedPolyline: '??', compatibleStops: null },
  {
    encodedPolyline: '??',
    distanceMeters: 1,
    durationSeconds: 1,
    compatibleStops: [
      {
        stopId: 'stop',
        name: 'Parada',
        routeFraction: 0,
        distanceFromRouteMeters: 0,
        location: { lat: 95, lng: 0 },
      },
    ],
  },
])(
  'rejects incomplete route preview before publishing or rendering: %p',
  async response => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(response);
    await expect(
      getDirections({ lat: 25, lng: -100 }, { lat: 26, lng: -100 }),
    ).rejects.toThrow('recorrido');
  },
);
test('decodes the Google example and rejects truncated or overflowing coordinates', () => {
  expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
  for (const malformed of ['_', '?', '~~~~~~~~?', '\u0000?', '~~~~~F??']) {
    expect(() => decodePolyline(malformed)).toThrow();
  }
});

test('rejects invalid coordinates before passing a place to the native map', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({
    placeId: 'x',
    location: { lat: 100, lng: -100 },
  });
  await expect(getPlaceDetails('x')).rejects.toThrow('ubicación');
});
test('rejects non-text addresses and keeps a missing reverse address recoverable', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({
    placeId: 'x',
    location: { lat: 25, lng: -100 },
    formattedAddress: {},
  });
  await expect(getPlaceDetails('x')).rejects.toThrow('ubicación');
  (apiRequest as jest.Mock).mockResolvedValueOnce({
    formattedAddress: {},
    placeId: null,
  });
  await expect(reverseGeocode({ lat: 25, lng: -100 })).rejects.toThrow(
    'dirección',
  );
  (apiRequest as jest.Mock).mockResolvedValueOnce(null);
  await expect(reverseGeocode({ lat: 25, lng: -100 })).resolves.toBeNull();
});
