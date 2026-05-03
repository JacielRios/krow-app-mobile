import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { SessionLoginMode } from '../../../app/sessionLoginMode';

export type RecentRideStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface RecentRide {
  rideId: string;
  status: RecentRideStatus;
  departureTime: string; // ISO 8601
  originLabel: string;
  destinationLabel: string;
  seats: number;
  pricePerSeat: number | null;
}

export interface UseRecentRidesOptions {
  limit?: number;
}

export interface UseRecentRidesResult {
  rides: RecentRide[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  reload: () => void;
}

const RIDE_COLUMNS =
  'ride_id, status, departure_time, origin_lat, origin_lng, destination_lat, destination_lng, available_seats, price_per_seat';

const PG_RELATION_NOT_FOUND = '42P01';

const formatCoord = (lat: number | null, lng: number | null): string => {
  if (lat == null || lng == null) return 'Ubicación no disponible';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const normalizeStatus = (raw: unknown): RecentRideStatus => {
  if (
    raw === 'scheduled' ||
    raw === 'in_progress' ||
    raw === 'completed' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  return 'scheduled';
};

interface RawRide {
  ride_id: string;
  status: string | null;
  departure_time: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  available_seats: number | null;
  price_per_seat: number | null;
}

const mapRawRide = (raw: RawRide): RecentRide => ({
  rideId: raw.ride_id,
  status: normalizeStatus(raw.status),
  departureTime: raw.departure_time,
  originLabel: formatCoord(raw.origin_lat, raw.origin_lng),
  destinationLabel: formatCoord(raw.destination_lat, raw.destination_lng),
  seats: raw.available_seats ?? 0,
  pricePerSeat:
    raw.price_per_seat != null ? Number(raw.price_per_seat) : null,
});

async function fetchDriverRides(
  userId: string,
  limit: number,
): Promise<{ rides: RecentRide[]; error: string | null }> {
  const { data: driverRow, error: driverError } = await supabase
    .from('driver_profiles')
    .select('driver_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (driverError) {
    return { rides: [], error: driverError.message };
  }
  if (!driverRow) {
    return {
      rides: [],
      error: 'No se encontró el perfil de conductor.',
    };
  }

  const { data, error: ridesError } = await supabase
    .from('rides')
    .select(RIDE_COLUMNS)
    .eq('driver_id', driverRow.driver_id)
    .order('departure_time', { ascending: false })
    .limit(limit);

  if (ridesError) {
    return { rides: [], error: ridesError.message };
  }

  return {
    rides: ((data ?? []) as RawRide[]).map(mapRawRide),
    error: null,
  };
}

async function fetchPassengerRides(
  userId: string,
  limit: number,
): Promise<{
  rides: RecentRide[];
  error: string | null;
  notice: string | null;
}> {
  // El pasajero ve sus rides via la tabla `bookings` (FK: bookings.user_id ->
  // auth.uid()). RLS `bookings_select_parties` permite al pasajero leer las
  // suyas; el join contra `rides` está cubierto por `private.can_view_ride`
  // (que permite ver el ride si tienes una booking en él).
  const { data, error } = await supabase
    .from('bookings')
    .select(`status, seats_reserved, ride:rides(${RIDE_COLUMNS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (
      error.code === PG_RELATION_NOT_FOUND ||
      /relation .* does not exist/i.test(error.message) ||
      error.message?.includes('Could not find the table')
    ) {
      return {
        rides: [],
        error: null,
        notice:
          'La tabla de reservas aún no está disponible. Funcionalidad pendiente.',
      };
    }
    return { rides: [], error: error.message, notice: null };
  }

  const rows = (data ?? []) as Array<{
    status: string | null;
    seats_reserved: number | null;
    ride: RawRide | RawRide[] | null;
  }>;

  const rides = rows
    .map(row => {
      const ride = Array.isArray(row.ride) ? row.ride[0] : row.ride;
      if (!ride) return null;
      // En la vista del pasajero los asientos relevantes son los reservados
      // en su booking (no los disponibles del ride completo).
      return mapRawRide({
        ...ride,
        available_seats: row.seats_reserved ?? ride.available_seats,
      });
    })
    .filter((r): r is RecentRide => r != null);

  return { rides, error: null, notice: null };
}

export function useRecentRides(
  role: SessionLoginMode | null,
  userId: string | null,
  options: UseRecentRidesOptions = {},
): UseRecentRidesResult {
  const { limit = 5 } = options;

  const [rides, setRides] = useState<RecentRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  useEffect(() => {
    let active = true;

    if (!role || !userId) {
      setRides([]);
      setLoading(false);
      setError(null);
      setNotice(null);
      return () => {
        active = false;
      };
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotice(null);

        const result =
          role === 'conductor'
            ? { ...(await fetchDriverRides(userId, limit)), notice: null }
            : await fetchPassengerRides(userId, limit);

        if (!active) return;
        // Defensivo: aunque las funciones internas siempre devuelven un
        // objeto, blindamos por si alguna mutación futura introduce un
        // null/undefined (caso "rides of null" que estamos rastreando).
        setRides(Array.isArray(result?.rides) ? result.rides : []);
        setError(result?.error ?? null);
        setNotice(result?.notice ?? null);
      } catch (e: any) {
        if (!active) return;
        setRides([]);
        setError(e?.message ?? 'Error inesperado al cargar tus viajes.');
        setNotice(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [role, userId, limit, reloadTick]);

  return { rides, loading, error, notice, reload };
}
