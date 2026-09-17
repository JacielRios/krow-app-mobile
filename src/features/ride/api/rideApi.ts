import { apiRequest } from '../../../core/api/apiClient';
import type { AvailableRide } from '../types/rideSearch.types';
import type { PublishRidePayload } from '../types/ride.types';
import type { RideStatus } from '../types/ride.types';
import type { BookingRequest, BookingStatus, RideHeader } from '../types/booking.types';

export interface RecentRideApiView {
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
      myBooking: { bookingId: string; status: BookingStatus; seatsReserved: number; createdAt: string } | null;
      conductorInfo: { userId: string; fullName: string | null; profilePhoto: string | null; rating: number | null } | null;
      vehicleInfo: { vehicleId: string; brand: string | null; model: string | null; color: string | null; licensePlate: string | null } | null;
    };

export type ActiveRideDataApiView =
  | {
      role: 'conductor';
      ride: RideHeader;
      passengers: Array<{
        bookingId: string;
        bookingStatus: BookingStatus;
        userId: string;
        fullName: string | null;
        profilePhoto: string | null;
        rating: number | null;
        seatsReserved: number;
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
  match?: { score: number; originDistanceKm: number; destinationDistanceKm: number };
}

const fromApi = (ride: ApiRide): AvailableRide => ({
  ...ride,
  pricePerSeat: ride.pricePerSeatCents / 100,
});

export const rideApi = {
  async create(payload: PublishRidePayload): Promise<{ rideId: string }> {
    return apiRequest('/rides', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: payload.vehicle_id,
        origin: { lat: payload.origin_lat, lng: payload.origin_lng },
        destination: { lat: payload.destination_lat, lng: payload.destination_lng },
        originAddress: payload.origin_address,
        destinationAddress: payload.destination_address,
        routePolyline: payload.route_polyline,
        departureTime: payload.departure_time,
        availableSeats: payload.available_seats,
        pricePerSeatCents: Math.round(payload.price_per_seat * 100),
      }),
    });
  },
  async search(options: {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    maxResults?: number;
    maxDistanceKm?: number;
    fromTime?: Date | null;
    toTime?: Date | null;
  } = {}): Promise<AvailableRide[]> {
    const data = await apiRequest<ApiRide[]>('/rides/search', {
      method: 'POST',
      body: JSON.stringify({
        origin: options.origin,
        destination: options.destination,
        maxResults: options.maxResults,
        maxDistanceKm: options.maxDistanceKm,
        fromTime: options.fromTime?.toISOString(),
        toTime: options.toTime?.toISOString(),
      }),
    });
    return data.map(fromApi);
  },
  recent: (limit = 5) =>
    apiRequest<RecentRideApiView[]>(`/rides/mine/recent?limit=${limit}`),
  active: () => apiRequest<ActiveRideApiView | null>('/rides/mine/active'),
  scheduledView: (rideId: string) =>
    apiRequest<ScheduledRideApiView>(`/rides/${rideId}/scheduled-view`),
  activeView: (rideId: string) =>
    apiRequest<ActiveRideDataApiView>(`/rides/${rideId}/active-view`),
  start: (rideId: string) => apiRequest<{ success: boolean }>(`/rides/${rideId}/start`, { method: 'POST' }),
  cancel: (rideId: string) => apiRequest<{ success: boolean }>(`/rides/${rideId}/cancel`, { method: 'POST' }),
  completeStop: (rideId: string, bookingId: string) => apiRequest<{ success: boolean }>(`/rides/${rideId}/stops/${bookingId}/complete`, { method: 'POST' }),
};
