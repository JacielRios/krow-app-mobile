import { apiRequest } from '../../../core/api/apiClient';
import type { DirectionsResult } from '../../maps/api/mapsApi';
import type { FavoriteRoute, RouteEndpoint } from '../types/ride.types';
import { CAMPUS_ORIGIN } from '../domain/driverRideRules';
import { isValidPoint } from '../../maps/api/mapsApi';

export interface PilotCorridor {
  corridorId: string;
  name: string;
  code: string;
  direction: string | null;
  stops: Array<{
    stopId: string;
    externalId: string;
    name: string;
    address: string | null;
    municipality: string | null;
    location: { lat: number; lng: number };
    direction: string | null;
    active: boolean;
    stopOrder: number;
  }>;
}

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
  corridorId: string;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  transportStopIds: string[];
  defaultVehicleId?: string;
  defaultAvailableSeats?: number;
  defaultPricePerSeatCents?: number;
}

export const routeApi = {
  async corridors(): Promise<PilotCorridor[]> {
    const corridors = await apiRequest<PilotCorridor[]>('/routes/corridors');
    if (
      !Array.isArray(corridors) ||
      corridors.some(
        corridor =>
          !corridor ||
          typeof corridor.corridorId !== 'string' ||
          !corridor.corridorId ||
          typeof corridor.name !== 'string' ||
          !Array.isArray(corridor.stops) ||
          corridor.stops.some(
            stop =>
              !stop ||
              typeof stop.stopId !== 'string' ||
              !stop.stopId ||
              typeof stop.name !== 'string' ||
              !isValidPoint(stop.location) ||
              typeof stop.active !== 'boolean',
          ),
      )
    ) {
      throw new Error('No pudimos leer las avenidas del piloto. Reintenta.');
    }
    return corridors;
  },
  preview: (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime?: Date | null,
    corridorId?: string,
    transportStopIds?: string[],
  ) =>
    apiRequest<DirectionsResult>('/routes/preview', {
      method: 'POST',
      body: JSON.stringify({
        origin,
        destination,
        departureTime: departureTime?.toISOString(),
        corridorId,
        transportStopIds,
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
