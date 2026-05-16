/**
 * Ride disponible para reservar, devuelto por `useSearchRides`.
 * Incluye datos derivados del conductor y vehículo para que el componente de
 * matching pueda mostrar la información sin queries adicionales.
 */
import type { RideStatus } from './ride.types';

export interface AvailableRide {
  rideId: string;
  driverId: string;
  driverName: string | null;
  driverRating: number | null;
  vehicle: {
    vehicleId: string;
    brand: string | null;
    model: string | null;
    licensePlate: string | null;
    color: string | null;
  } | null;
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
  /** Direcciones humanas opcionales (las viejas filas pueden venir null). */
  originAddress: string | null;
  destinationAddress: string | null;
  /** Polyline encoded (Google Directions) capturado al publicar el ride. */
  routePolyline: string | null;
  departureTime: string; // ISO 8601
  availableSeats: number;
  pricePerSeat: number;
  status: RideStatus;
}

export interface SearchRidesParams {
  myOrigin: { lat: number; lng: number };
  myDestination: { lat: number; lng: number };
  myTime: Date;
  /** Tolerancia espacial para precandidatos (km). Default 8. */
  maxDistanceKm?: number;
  /** Tolerancia temporal en minutos para precandidatos. Default 60. */
  maxTimeWindowMin?: number;
  /** Tope superior de filas leídas de Supabase. Default 50. */
  fetchLimit?: number;
}
