export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type BookingMutableStatus = Extract<
  BookingStatus,
  'confirmed' | 'cancelled'
>;

/**
 * Payload de la RPC `request_booking`. La RPC resuelve los stops del ride
 * (stop_order = 1 origen, stop_order = 2 destino) automáticamente, por lo que
 * el cliente solo necesita declarar a qué viaje se une y cuántos asientos.
 */
export interface RequestBookingPayload {
  ride_id: string;
  seats_reserved?: number;
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
 * Cabecera del ride para la pantalla de solicitudes.
 */
export interface RideHeader {
  rideId: string;
  driverId: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  status: string;
  originAddress: string | null;
  destinationAddress: string | null;
}
