import { useCallback, useState } from 'react';
import { supabase } from '../../../services/supabase';
import type { AvailableRide } from '../types/rideSearch.types';
import { coerceRideStatus } from '../types';

interface RawSearchRow {
  ride_id: string;
  driver_id: string;
  driver_user_id: string | null;
  driver_name: string | null;
  driver_rating: number | string | null;
  vehicle_id: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  origin_lat: number | string;
  origin_lng: number | string;
  destination_lat: number | string;
  destination_lng: number | string;
  origin_address: string | null;
  destination_address: string | null;
  route_polyline: string | null;
  departure_time: string;
  available_seats: number;
  price_per_seat: number | string;
  status: string;
}

const toNum = (v: number | string | null | undefined, fallback = 0): number => {
  if (v == null) return fallback;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const mapRow = (row: RawSearchRow): AvailableRide => ({
  rideId: row.ride_id,
  driverId: row.driver_id,
  driverName: row.driver_name,
  driverRating:
    row.driver_rating != null ? toNum(row.driver_rating, 0) : null,
  vehicle: row.vehicle_id
    ? {
        vehicleId: row.vehicle_id,
        brand: row.vehicle_brand,
        model: row.vehicle_model,
        licensePlate: row.vehicle_plate,
        color: row.vehicle_color,
      }
    : null,
  origin: {
    lat: toNum(row.origin_lat),
    lng: toNum(row.origin_lng),
  },
  destination: {
    lat: toNum(row.destination_lat),
    lng: toNum(row.destination_lng),
  },
  originAddress: row.origin_address,
  destinationAddress: row.destination_address,
  routePolyline: row.route_polyline,
  departureTime: row.departure_time,
  availableSeats: row.available_seats,
  pricePerSeat: toNum(row.price_per_seat),
  status: coerceRideStatus(row.status),
});

export interface UseSearchRidesResult {
  rides: AvailableRide[];
  loading: boolean;
  error: string | null;
  /** Lanza una búsqueda nueva. Usa esto desde un onPress, no desde un effect. */
  search: (options?: SearchOptions) => Promise<AvailableRide[]>;
  reset: () => void;
}

export interface SearchOptions {
  maxResults?: number;
  fromTime?: Date | null;
  toTime?: Date | null;
}

/**
 * Hook on-demand para buscar rides disponibles. La búsqueda no se dispara
 * automáticamente: el caller invoca `search()` cuando el formulario está listo.
 */
export function useSearchRides(): UseSearchRidesResult {
  const [rides, setRides] = useState<AvailableRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (options?: SearchOptions): Promise<AvailableRide[]> => {
      setLoading(true);
      setError(null);
      try {
        const res = await supabase.rpc('search_available_rides', {
          p_max_results: options?.maxResults ?? 50,
          p_from_time: options?.fromTime?.toISOString() ?? null,
          p_to_time: options?.toTime?.toISOString() ?? null,
        });

        if (res?.error) {
          setError(res.error.message);
          setRides([]);
          return [];
        }

        const rows = (res?.data ?? []) as RawSearchRow[];
        const mapped = rows
          .filter((r): r is RawSearchRow => r != null)
          .map(mapRow);
        setRides(mapped);
        return mapped;
      } catch (e: any) {
        setError(e?.message ?? 'Error inesperado al buscar viajes.');
        setRides([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setRides([]);
    setError(null);
  }, []);

  return { rides, loading, error, search, reset };
}
