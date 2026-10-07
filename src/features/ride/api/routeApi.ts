import { apiRequest } from '../../../core/api/apiClient';
import type { DirectionsResult } from '../../maps/api/mapsApi';
import type { FavoriteRoute, RouteEndpoint } from '../types/ride.types';
import { CAMPUS_ORIGIN } from '../domain/driverRideRules';

const withCampusOrigin = (payload: SaveFavoriteRoutePayload) => ({
  ...payload,
  origin: {
    address: CAMPUS_ORIGIN.address,
    placeId: CAMPUS_ORIGIN.placeId,
    ...CAMPUS_ORIGIN.location,
  },
});

export interface SaveFavoriteRoutePayload {
  name: string;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  transportStopIds: string[];
  defaultVehicleId?: string;
  defaultAvailableSeats?: number;
  defaultPricePerSeatCents?: number;
}

export const routeApi = {
  preview: (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime?: Date | null,
  ) =>
    apiRequest<DirectionsResult>('/routes/preview', {
      method: 'POST',
      body: JSON.stringify({
        origin,
        destination,
        departureTime: departureTime?.toISOString(),
      }),
    }),
  favorites: () => apiRequest<FavoriteRoute[]>('/routes/favorites'),
  favorite: (routeId: string) =>
    apiRequest<FavoriteRoute>(`/routes/favorites/${routeId}`),
  createFavorite: (payload: SaveFavoriteRoutePayload) =>
    apiRequest<{ routeId: string }>('/routes/favorites', {
      method: 'POST',
      body: JSON.stringify(withCampusOrigin(payload)),
    }),
  updateFavorite: (routeId: string, payload: SaveFavoriteRoutePayload) =>
    apiRequest<{ routeId: string }>(`/routes/favorites/${routeId}`, {
      method: 'PATCH',
      body: JSON.stringify(withCampusOrigin(payload)),
    }),
  deleteFavorite: (routeId: string) =>
    apiRequest<{ success: boolean }>(`/routes/favorites/${routeId}`, {
      method: 'DELETE',
    }),
};
