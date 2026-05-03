export interface PublishRidePayload {
  vehicle_id: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_address?: string;
  destination_address?: string;
  /** Polyline encoded de Google Directions (overview_polyline.points). */
  route_polyline?: string;
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
}

export interface PublishRideResult {
  rideId: string | null;
  error: string | null;
}
