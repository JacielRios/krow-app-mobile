export interface CreateRidePayload {
  vehicle_id: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  departure_time: string; // ISO 8601 con timezone, ej: "2026-04-25T10:00:00-06:00"
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

export interface CreateRideResult {
  rideId: string | null;
  error: string | null;
}
