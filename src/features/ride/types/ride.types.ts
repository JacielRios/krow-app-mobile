/**
 * Estados posibles de un ride en la BD `rides.status`.
 * - scheduled: publicado, aceptando reservas.
 * - full: alcanzó capacidad (no admite más bookings).
 * - in_progress: el conductor inició el viaje.
 * - completed: viaje finalizado.
 * - cancelled: cancelado por el conductor o el sistema.
 */
export type RideStatus =
  | 'scheduled'
  | 'full'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface PublishRidePayload {
  vehicle_id: string;
  corridor_id?: string;
  favorite_route_id?: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_address?: string;
  destination_address?: string;
  transport_stop_ids: string[];
  departure_time: string; // ISO 8601 con timezone
  available_seats: number;
  price_per_seat: number;
}

export interface DriverVehicle {
  vehicle_id: string;
  brand: string;
  model: string;
  car_year: number;
  license_plate: string;
  car_color: string;
  capacity: number;
}

export interface RideStop {
  stopId: string;
  transportStopId: string | null;
  stopOrder: number;
  routeFraction: number | null;
  name: string;
  address: string;
  municipality: string | null;
  location: { lat: number; lng: number };
  active: boolean;
}

export interface FavoriteRoute {
  routeId: string;
  corridorId?: string | null;
  corridorName?: string | null;
  name: string;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  defaults: {
    vehicleId: string | null;
    availableSeats: number | null;
    pricePerSeatCents: number | null;
  };
  stops: Array<RideStop & { externalId: string; routeFraction: number }>;
  hasStaleStops: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteEndpoint {
  placeId?: string | null;
  address: string;
  lat: number;
  lng: number;
}

export interface RideDetail {
  rideId: string;
  corridorId?: string | null;
  corridorName?: string | null;
  favoriteRouteId: string | null;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  routePolyline: string | null;
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;
  departureTime: string;
  availableSeats: number;
  pricePerSeatCents: number;
  status: RideStatus;
  version: number;
  vehicle: DriverVehicle | null;
  stops: RideStop[];
  canEdit: boolean;
  editBlockReason: string | null;
}

export interface DriverRideListItem {
  rideId: string;
  originAddress: string | null;
  destinationAddress: string | null;
  departureTime: string;
  availableSeats: number;
  pricePerSeatCents: number;
  status: RideStatus;
  version: number;
  routeDistanceMeters: number | null;
  routeDurationSeconds: number | null;
  vehicle: DriverVehicle | null;
  canEdit: boolean;
  activeBookings: number;
}

export interface PublishRideResult {
  rideId: string | null;
  error: string | null;
}
