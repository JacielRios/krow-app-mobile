import type { RideStatus } from './ride.types';

/**
 * Ride disponible para reservar, devuelto por `useSearchRides`.
 * Incluye datos derivados del conductor y vehículo para que el componente de
 * matching pueda mostrar la información sin queries adicionales.
 */
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
    capacity: number;
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
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;
  bestPickupStop: StopOption;
  bestDropoffStop: StopOption;
  match: {
    pickupDistanceMeters: number;
    dropoffDistanceMeters: number;
  };
}

export interface StopOption {
  stopId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distanceMeters: number;
}

export interface StopPair {
  pickup: StopOption;
  dropoff: StopOption;
}

export type PassengerStopRole = 'pickup' | 'dropoff';
export type TransportStopType = 'general' | 'official_boarding_zone';

export interface PassengerStopCandidate {
  role: PassengerStopRole;
  stopId: string;
  externalId: string;
  name: string;
  address: string | null;
  municipality: string | null;
  stopType: TransportStopType;
  location: { lat: number; lng: number };
  distanceMeters: number;
  enabled: boolean;
  rideCount: number;
}

export interface PassengerStopCandidates {
  radiusMeters: number;
  pickupStops: PassengerStopCandidate[];
  dropoffStops: PassengerStopCandidate[];
  pairs: Array<{
    pickupStopId: string;
    dropoffStopId: string;
    rideCount: number;
  }>;
}

export interface SearchRidesParams {
  myOrigin: { lat: number; lng: number };
  myDestination: { lat: number; lng: number };
  myTime: Date;
  /** Tolerancia espacial para precandidatos (km). Default 8. */
  maxDistanceKm?: number;
  /** Tolerancia temporal en minutos para precandidatos. Default 60. */
  maxTimeWindowMin?: number;
  /** Tope superior de resultados solicitados a KROW API. Default 50. */
  fetchLimit?: number;
}
