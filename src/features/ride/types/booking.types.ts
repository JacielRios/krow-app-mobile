import type { RideStatus } from './ride.types';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'interrupted';

export type BookingMutableStatus = Extract<
  BookingStatus,
  'confirmed' | 'cancelled' | 'rejected'
>;

/**
 * Reserva con paradas explícitas validadas por el backend.
 */
export interface RequestBookingPayload {
  ride_id: string;
  seats_reserved?: number;
  pickup_stop_id: string;
  dropoff_stop_id: string;
}

export interface RequestBookingResult {
  bookingId: string | null;
  error: string | null;
}

export interface UpdateBookingStatusResult {
  success: boolean;
  error: string | null;
}

/**
 * Vista del pasajero que reservó un asiento sobre un ride específico, usada
 * en `RideRequestsScreen` (lado conductor).
 */
export interface BookingRequest {
  bookingId: string;
  rideId: string;
  status: BookingStatus;
  seatsReserved: number;
  createdAt: string;
  passenger: {
    userId: string;
    fullName: string | null;
    profilePhoto: string | null;
    rating: number | null;
  };
}

/**
 * Cabecera del ride para las pantallas de solicitudes y viaje activo.
 *
 * Los campos `originLat`/`originLng`/`destinationLat`/`destinationLng` y
 * `routePolyline` son opcionales: los hooks que alimentan el mapa
 * (p.ej. `useActiveRideData`) los llenan; los hooks que sólo necesitan el
 * encabezado (p.ej. `useRideScheduled` para el driver) pueden omitirlos.
 */
export interface RideHeader {
  rideId: string;
  driverId: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  status: RideStatus;
  originAddress: string | null;
  destinationAddress: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  routePolyline?: string | null;
}
