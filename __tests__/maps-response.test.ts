import {
  searchPlaces,
  getPlaceDetails,
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

test('rejects invalid coordinates before passing a place to the native map', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({
    placeId: 'x',
    location: { lat: 100, lng: -100 },
  });
  await expect(getPlaceDetails('x')).rejects.toThrow('ubicación');
});
