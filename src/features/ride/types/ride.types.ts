/**
 * Estados del viaje (dominio UI). Postgres puede seguir devolviendo `scheduled`;
 * usar `coerceRideStatus()` al leer.
 *
 * Maquina (intención de producto):
 *   open/in_progress/full → in_progress → completed | cancelled
 *   + cancel_route del conductor cualquier momento permitido por RPC.
 */
export type RideStatus =
  | 'scheduled'
  | 'open'
  | 'full'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const KNOWN_STATUS = new Set<string>([
  'scheduled',
  'open',
  'full',
  'in_progress',
  'completed',
  'cancelled',
]);

/** Normaliza strings sueltos desde Supabase. */
export function coerceRideStatus(raw: unknown): RideStatus {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (KNOWN_STATUS.has(s)) {
    return s as RideStatus;
  }
  return 'scheduled';
}

export const isTerminalRideStatus = (s: RideStatus): boolean =>
  s === 'completed' || s === 'cancelled';

export const isActiveRideStatus = (s: RideStatus): boolean =>
  s === 'scheduled' || s === 'open' || s === 'full' || s === 'in_progress';

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
