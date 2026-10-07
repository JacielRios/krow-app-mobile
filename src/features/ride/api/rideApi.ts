import { apiRequest } from '../../../core/api/apiClient';
import { readActiveRideView } from './activeRideView';
import type {
  AvailableRide,
  PassengerStopCandidates,
  StopOption,
} from '../types/rideSearch.types';
import { isValidPoint } from '../../maps/api/mapsApi';
import { CAMPUS_ORIGIN } from '../domain/driverRideRules';
import type {
  DriverRideListItem,
  PublishRidePayload,
  RideDetail,
} from '../types/ride.types';
import type { RideStatus } from '../types/ride.types';
import type {
  BookingRequest,
  BookingStatus,
  RideHeader,
} from '../types/booking.types';
import type { StopPair } from '../types/rideSearch.types';

export interface RecentRideApiView {
  bookingStatus?: BookingStatus;
  rideId: string;
  status: RideStatus;
  departureTime: string;
  originLabel: string;
  destinationLabel: string;
  seats: number;
  pricePerSeat: number | null;
}

export interface ActiveRideApiView {
  rideId: string;
  status: RideStatus;
  role: 'driver' | 'passenger';
  bookingStatus?: BookingStatus;
  originAddress: string | null;
  destinationAddress: string | null;
  departureTime: string;
}

export type ScheduledRideApiView =
  | {
      role: 'conductor';
      ride: RideHeader | null;
      pendingBookings: BookingRequest[];
      confirmedBookings: BookingRequest[];
    }
  | {
      role: 'pasajero';
      ride: RideHeader | null;
      myBooking: {
        bookingId: string;
        status: BookingStatus;
        seatsReserved: number;
        createdAt: string;
      } | null;
      conductorInfo: {
        userId: string;
        fullName: string | null;
        profilePhoto: string | null;
        rating: number | null;
      } | null;
      vehicleInfo: {
        vehicleId: string;
        brand: string | null;
        model: string | null;
        color: string | null;
        licensePlate: string | null;
      } | null;
    };

export type ActiveRideDataApiView =
  | {
      role: 'conductor';
      ride: RideHeader;
      canComplete: boolean;
      passengers: Array<{
        bookingId: string;
        bookingStatus: BookingStatus;
        userId: string;
        fullName: string | null;
        profilePhoto: string | null;
        rating: number | null;
        seatsReserved: number;
        pickupLat: number | null;
        pickupLng: number | null;
        pickupAddress: string | null;
        pickupOrder: number | null;
        dropoffOrder: number | null;
        dropoffLat: number;
        dropoffLng: number;
        dropoffAddress: string | null;
      }>;
    }
  | {
      role: 'pasajero';
      ride: RideHeader;
      myBooking: {
        bookingId: string;
        status: BookingStatus;
        dropoffLat: number | null;
        dropoffLng: number | null;
        dropoffAddress: string | null;
      };
      driver: {
        userId: string;
        fullName: string | null;
        profilePhoto: string | null;
        rating: number | null;
        vehicleBrand: string | null;
        vehicleModel: string | null;
        vehicleColor: string | null;
        vehicleLicensePlate: string | null;
      };
    };

interface ApiRide extends Omit<AvailableRide, 'pricePerSeat'> {
  pricePerSeatCents: number;
}

const validStop = (stop: StopOption | null | undefined) =>
  !!stop &&
  typeof stop.stopId === 'string' &&
  !!stop.stopId &&
  typeof stop.name === 'string' &&
  isValidPoint(stop.location) &&
  Number.isFinite(stop.distanceMeters) &&
  stop.distanceMeters >= 0;

const fromApi = (ride: ApiRide): AvailableRide => {
  if (
    !ride ||
    typeof ride.rideId !== 'string' ||
    !ride.rideId ||
    !isValidPoint(ride.origin) ||
    !isValidPoint(ride.destination) ||
    typeof ride.departureTime !== 'string' ||
    !Number.isFinite(Date.parse(ride.departureTime)) ||
    !Number.isSafeInteger(ride.pricePerSeatCents) ||
    ride.pricePerSeatCents < 0 ||
    !Number.isInteger(ride.availableSeats) ||
    ride.availableSeats < 0 ||
    (ride.driverName != null && typeof ride.driverName !== 'string') ||
    (ride.originAddress != null && typeof ride.originAddress !== 'string') ||
    (ride.destinationAddress != null &&
      typeof ride.destinationAddress !== 'string') ||
    (ride.routePolyline != null && typeof ride.routePolyline !== 'string') ||
    (ride.driverRating != null && !Number.isFinite(ride.driverRating)) ||
    !validStop(ride.bestPickupStop) ||
    !validStop(ride.bestDropoffStop) ||
    !ride.match ||
    !Number.isFinite(ride.match.pickupDistanceMeters) ||
    !Number.isFinite(ride.match.dropoffDistanceMeters)
  ) {
    throw new Error(
      'No pudimos leer los viajes disponibles. Reintenta la búsqueda.',
    );
  }
  return { ...ride, pricePerSeat: ride.pricePerSeatCents / 100 };
};

export const rideApi = {
  async create(payload: PublishRidePayload): Promise<{ rideId: string }> {
    return apiRequest('/rides', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: payload.vehicle_id,
        favoriteRouteId: payload.favorite_route_id,
        origin: CAMPUS_ORIGIN.location,
        destination: {
          lat: payload.destination_lat,
          lng: payload.destination_lng,
        },
        originAddress: CAMPUS_ORIGIN.address,
        destinationAddress: payload.destination_address,
        transportStopIds: payload.transport_stop_ids,
        departureTime: payload.departure_time,
        availableSeats: payload.available_seats,
        pricePerSeatCents: Math.round(payload.price_per_seat * 100),
      }),
    });
  },
  async search(options: {
    origin?: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    maxResults?: number;
    maxDistanceKm?: number;
    pickupTransportStopId?: string;
    dropoffTransportStopId?: string;
    fromTime?: Date | null;
    toTime?: Date | null;
  }): Promise<AvailableRide[]> {
    const data = await apiRequest<ApiRide[]>('/rides/search', {
      method: 'POST',
      body: JSON.stringify({
        origin: options.origin ?? CAMPUS_ORIGIN.location,
        destination: options.destination,
        maxResults: options.maxResults,
        maxDistanceMeters: 1000,
        pickupTransportStopId: options.pickupTransportStopId,
        dropoffTransportStopId: options.dropoffTransportStopId,
        fromTime: options.fromTime?.toISOString(),
        toTime: options.toTime?.toISOString(),
      }),
    });
    if (!Array.isArray(data))
      throw new Error(
        'No pudimos leer los viajes disponibles. Reintenta la búsqueda.',
      );
    return data.map(fromApi);
  },
  stopCandidates: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    options: { pickupScope?: 'campus' | 'route' } = {},
  ) => {
    const data = await apiRequest<PassengerStopCandidates>(
        '/rides/stops/candidates',
        {
          method: 'POST',
          body: JSON.stringify({
            origin,
            destination,
            pickupScope: options.pickupScope ?? 'campus',
            maxDistanceMeters: 1000,
          }),
        },
      ),
      validStops = (
        stops: PassengerStopCandidates['pickupStops'] | null | undefined,
      ) =>
        Array.isArray(stops) &&
        stops.every(
          stop =>
            !!stop &&
            typeof stop.stopId === 'string' &&
            !!stop.stopId &&
            typeof stop.name === 'string' &&
            isValidPoint(stop.location) &&
            Number.isFinite(stop.distanceMeters) &&
            typeof stop.enabled === 'boolean' &&
            Number.isInteger(stop.rideCount),
        );
    if (
      !data ||
      !validStops(data.pickupStops) ||
      !validStops(data.dropoffStops) ||
      !Array.isArray(data.pairs) ||
      data.pairs.some(
        pair =>
          !pair ||
          typeof pair.pickupStopId !== 'string' ||
          typeof pair.dropoffStopId !== 'string' ||
          !data.pickupStops.some(stop => stop.stopId === pair.pickupStopId) ||
          !data.dropoffStops.some(stop => stop.stopId === pair.dropoffStopId),
      )
    ) {
      throw new Error(
        'No pudimos leer las paradas cercanas. Reintenta la búsqueda.',
      );
    }
    return data;
  },
  recent: (limit = 5, context: 'driver' | 'passenger' = 'passenger') =>
    apiRequest<RecentRideApiView[]>(
      `/rides/mine/recent?limit=${limit}&context=${context}`,
    ),
  active: (context: 'driver' | 'passenger' = 'passenger') =>
    apiRequest<ActiveRideApiView | null>(
      '/rides/mine/active?context=' + context,
    ),
  mine: (
    status?: RideStatus,
    offset = 0,
    limit = 50,
    group?: 'upcoming' | 'active' | 'history',
  ) =>
    apiRequest<DriverRideListItem[]>(
      `/rides/mine?offset=${offset}&limit=${limit}${
        status ? `&status=${status}` : ''
      }${group ? `&group=${group}` : ''}`,
    ),
  detail: (rideId: string) => apiRequest<RideDetail>(`/rides/${rideId}`),
  update: (rideId: string, version: number, payload: PublishRidePayload) =>
    apiRequest<{ rideId: string; version: number }>(`/rides/${rideId}`, {
      method: 'PUT',
      body: JSON.stringify({
        version,
        vehicleId: payload.vehicle_id,
        favoriteRouteId: payload.favorite_route_id,
        origin: { lat: payload.origin_lat, lng: payload.origin_lng },
        destination: {
          lat: payload.destination_lat,
          lng: payload.destination_lng,
        },
        originAddress: payload.origin_address,
        destinationAddress: payload.destination_address,
        transportStopIds: payload.transport_stop_ids,
        departureTime: payload.departure_time,
        availableSeats: payload.available_seats,
        pricePerSeatCents: Math.round(payload.price_per_seat * 100),
      }),
    }),
  stopOptions: (
    rideId: string,
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) =>
    apiRequest<{ pairs: StopPair[] }>(`/rides/${rideId}/stop-options`, {
      method: 'POST',
      body: JSON.stringify({ origin, destination, maxDistanceMeters: 1000 }),
    }),
  scheduledView: (rideId: string) =>
    apiRequest<ScheduledRideApiView>(`/rides/${rideId}/scheduled-view`),
  activeView: async (rideId: string) =>
    readActiveRideView(
      await apiRequest<unknown>(`/rides/${rideId}/active-view`),
    ),
  start: (rideId: string) =>
    apiRequest<{ success: boolean }>(`/rides/${rideId}/start`, {
      method: 'POST',
    }),
  cancel: (rideId: string) =>
    apiRequest<{ success: boolean }>(`/rides/${rideId}/cancel`, {
      method: 'POST',
    }),
  complete: (rideId: string) =>
    apiRequest<{ success: boolean }>(`/rides/${rideId}/complete`, {
      method: 'POST',
    }),
  completeStop: (rideId: string, bookingId: string) =>
    apiRequest<{ success: boolean }>(
      `/rides/${rideId}/stops/${bookingId}/complete`,
      { method: 'POST' },
    ),
};
