import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { SessionLoginMode } from '../../../app/sessionLoginMode';
import { coerceRideStatus, type RideStatus } from '../../../features/ride/types';

/** Alias estable para listados recientes: mismos valores que RideStatus del dominio. */
export type RecentRideStatus = RideStatus;

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
  'ride_id, status, departure_time, origin_lat, origin_lng, destination_lat, destination_lng, origin_address, destination_address, available_seats, price_per_seat';

const PG_RELATION_NOT_FOUND = '42P01';

/** Estados del viaje para cupos activos vs historial (home conductor y pasajero). */
const RIDE_HOME_ACTIVE_STATUSES = [
  'scheduled',
  'open',
  'full',
  'in_progress',
] as const;
const RIDE_HOME_HISTORY_STATUSES = ['completed', 'cancelled'] as const;

/** PostgREST a veces devuelve numeric como string; normalizamos antes de toFixed. */
const formatCoord = (lat: unknown, lng: unknown): string => {
  const la = lat == null || lat === '' ? NaN : Number(lat);
  const ln = lng == null || lng === '' ? NaN : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return 'Ubicación no disponible';
  return `${la.toFixed(4)}, ${ln.toFixed(4)}`;
};

const normalizeStatus = (raw: unknown): RecentRideStatus => coerceRideStatus(raw);
interface RawRide {
  ride_id: string;
  status: string | null;
  departure_time: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_address: string | null;
  destination_address: string | null;
  available_seats: number | null;
  price_per_seat: number | null;
}

const mapRawRide = (raw: RawRide): RecentRide => ({
  rideId: String(raw.ride_id ?? ''),
  status: normalizeStatus(raw.status),
  departureTime:
    raw.departure_time != null && raw.departure_time !== ''
      ? String(raw.departure_time)
      : '',
  originLabel: raw.origin_address ?? formatCoord(raw.origin_lat, raw.origin_lng),
  destinationLabel: raw.destination_address ?? formatCoord(raw.destination_lat, raw.destination_lng),
  seats: raw.available_seats ?? 0,
  pricePerSeat:
    raw.price_per_seat != null ? Number(raw.price_per_seat) : null,
});

/** Evita que una fila corrupta tire toda la respuesta RPC/postgrest. */
function mapRpcRowsToRecentRides(rows: unknown[]): RecentRide[] {
  const out: RecentRide[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (row == null || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const rideId = o.ride_id ?? o.rideId;
      if (rideId == null || String(rideId).trim() === '') continue;
      const raw = {
        ...o,
        ride_id: String(rideId),
        status: (o.status as string | null) ?? null,
        departure_time:
          o.departure_time != null && o.departure_time !== ''
            ? String(o.departure_time)
            : ((o.departureTime as string | undefined) ?? ''),
        origin_lat: (o.origin_lat as number | null) ?? (o.originLat as number | null) ?? null,
        origin_lng: (o.origin_lng as number | null) ?? (o.originLng as number | null) ?? null,
        destination_lat:
          (o.destination_lat as number | null) ?? (o.destinationLat as number | null) ?? null,
        destination_lng:
          (o.destination_lng as number | null) ?? (o.destinationLng as number | null) ?? null,
        origin_address:
          (o.origin_address as string | null) ?? (o.originAddress as string | null) ?? null,
        destination_address:
          (o.destination_address as string | null) ??
          (o.destinationAddress as string | null) ??
          null,
        available_seats:
          (o.available_seats as number | null) ?? (o.availableSeats as number | null) ?? null,
        price_per_seat:
          (o.price_per_seat as number | null) ?? (o.pricePerSeat as number | null) ?? null,
      } as RawRide;
      out.push(mapRawRide(raw));
    } catch (e) {
      if (__DEV__) {
        console.warn('[useRecentRides] fila omitida al mapear:', i, e);
      }
    }
  }
  return out;
}

/**
 * Respaldo cuando la RPC falla o devuelve vacío: RLS permite al conductor
 * ver sus filas en `rides` vía private.can_view_ride.
 */
async function fetchDriverRidesFromTable(
  userId: string,
  limit: number,
): Promise<{ rides: RecentRide[]; error: string | null }> {
  const { data: dp, error: dpError } = await supabase
    .from('driver_profiles')
    .select('driver_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (dpError) {
    return { rides: [], error: dpError.message };
  }
  if (!dp?.driver_id) {
    return { rides: [], error: null };
  }

  const activeQ = supabase
    .from('rides')
    .select(RIDE_COLUMNS)
    .eq('driver_id', dp.driver_id)
    .in('status', [...RIDE_HOME_ACTIVE_STATUSES])
    .order('departure_time', { ascending: true })
    .limit(limit);

  const historyQ = supabase
    .from('rides')
    .select(RIDE_COLUMNS)
    .eq('driver_id', dp.driver_id)
    .in('status', [...RIDE_HOME_HISTORY_STATUSES])
    .order('departure_time', { ascending: false })
    .limit(limit);

  const [activeRes, historyRes] = await Promise.all([activeQ, historyQ]);

  if (activeRes.error && historyRes.error) {
    return { rides: [], error: activeRes.error.message };
  }

  const a = (activeRes.data ?? []) as RawRide[];
  const h = (historyRes.data ?? []) as RawRide[];
  const rows = [...a, ...h];

  return {
    rides: mapRpcRowsToRecentRides(rows as unknown[]),
    error: null,
  };
}

async function fetchDriverRides(
  userId: string,
  limit: number,
): Promise<{ rides: RecentRide[]; error: string | null }> {
  console.log('[useRecentRides] fetchDriverRides via RPC, limit:', limit);

  let rpcErrorMsg: string | null = null;

  try {
    const { data, error: rpcError } = await supabase.rpc('get_my_driver_rides', {
      p_limit: limit,
    });

    if (__DEV__) {
      const len = Array.isArray(data) ? data.length : 0;
      console.log('[useRecentRides] RPC supabase raw:', { data, error: rpcError });
      console.log('[useRecentRides] RPC resumen:', {
        filas: len,
        error: rpcError?.message ?? null,
        primeraFila: len > 0 ? (data as unknown[])[0] : null,
      });
    }

    if (!rpcError && Array.isArray(data) && data.length > 0) {
      const rows = data as unknown[];
      const mapped = mapRpcRowsToRecentRides(rows);
      if (__DEV__) {
        console.log('[useRecentRides] fetchDriverRides mapeados:', mapped.length, 'de', rows.length);
      }
      return {
        rides: mapped.slice(),
        error: null,
      };
    }

    if (rpcError) {
      rpcErrorMsg = rpcError.message;
      console.warn('[useRecentRides] RPC ERROR:', rpcError.message);
    } else {
      console.warn('[useRecentRides] RPC empty/null, trying rides table fallback');
    }
  } catch (e: any) {
    rpcErrorMsg = e?.message ?? 'Error al cargar viajes.';
    console.error('[useRecentRides] fetchDriverRides RPC EXCEPTION:', e);
  }

  const fallback = await fetchDriverRidesFromTable(userId, limit);
  if (fallback.rides.length > 0) {
    return { rides: fallback.rides, error: null };
  }
  if (fallback.error) {
    return { rides: [], error: fallback.error };
  }

  return { rides: [], error: rpcErrorMsg };
}

const BOOKING_RIDE_SELECT = `status, seats_reserved, ride:rides!inner(${RIDE_COLUMNS})`;

/** Filas de bookings con ride embebido → RecentRide (asientos = reserva del pasajero). */
function mapPassengerBookingRows(
  data:
    | Array<{
        status: string | null;
        seats_reserved: number | null;
        ride: RawRide | RawRide[] | null;
      }>
    | null,
): RecentRide[] {
  const rows = data ?? [];
  return rows
    .map(row => {
      const ride = Array.isArray(row.ride) ? row.ride[0] : row.ride;
      if (!ride) return null;
      return mapRawRide({
        ...ride,
        available_seats: row.seats_reserved ?? ride.available_seats,
      });
    })
    .filter((r): r is RecentRide => r != null);
}

function isBookingsSchemaMissingMessage(message: string, code?: string): boolean {
  return (
    code === PG_RELATION_NOT_FOUND ||
    /relation .* does not exist/i.test(message) ||
    message.includes('Could not find the table')
  );
}

/**
 * Respaldo: dos consultas (viajes activos + historial) como get_my_passenger_rides.
 * RLS: lectura de bookings propias y rides vinculadas vía private.can_view_ride.
 */
async function fetchPassengerRidesFromTable(
  userId: string,
  limit: number,
): Promise<{
  rides: RecentRide[];
  error: string | null;
  notice: string | null;
}> {
  const activeQ = supabase
    .from('bookings')
    .select(BOOKING_RIDE_SELECT)
    .eq('user_id', userId)
    .in('ride.status', [...RIDE_HOME_ACTIVE_STATUSES])
    .order('departure_time', { ascending: true, foreignTable: 'rides' })
    .limit(limit);

  const historyQ = supabase
    .from('bookings')
    .select(BOOKING_RIDE_SELECT)
    .eq('user_id', userId)
    .in('ride.status', [...RIDE_HOME_HISTORY_STATUSES])
    .order('departure_time', { ascending: false, foreignTable: 'rides' })
    .limit(limit);

  const [activeRes, historyRes] = await Promise.all([activeQ, historyQ]);

  if (activeRes.error && historyRes.error) {
    const err = activeRes.error ?? historyRes.error!;
    if (isBookingsSchemaMissingMessage(err.message, err.code)) {
      return {
        rides: [],
        error: null,
        notice:
          'La tabla de reservas aún no está disponible. Funcionalidad pendiente.',
      };
    }
    return { rides: [], error: err.message, notice: null };
  }

  const rides = [
    ...mapPassengerBookingRows(activeRes.data),
    ...mapPassengerBookingRows(historyRes.data),
  ];

  return { rides, error: null, notice: null };
}

async function fetchPassengerRides(
  userId: string,
  limit: number,
): Promise<{
  rides: RecentRide[];
  error: string | null;
  notice: string | null;
}> {
  if (__DEV__) {
    console.log('[useRecentRides] fetchPassengerRides via RPC, limit:', limit);
  }

  let rpcErrorMsg: string | null = null;

  try {
    const { data, error: rpcError } = await supabase.rpc('get_my_passenger_rides', {
      p_limit: limit,
    });

    if (__DEV__) {
      const len = Array.isArray(data) ? data.length : 0;
      console.log('[useRecentRides] passenger RPC raw:', { data, error: rpcError });
      console.log('[useRecentRides] passenger RPC resumen:', {
        filas: len,
        error: rpcError?.message ?? null,
        primeraFila: len > 0 ? (data as unknown[])[0] : null,
      });
    }

    if (!rpcError && Array.isArray(data) && data.length > 0) {
      const rows = data as unknown[];
      const mapped = mapRpcRowsToRecentRides(rows);
      if (__DEV__) {
        console.log('[useRecentRides] passenger RPC mapeados:', mapped.length, 'de', rows.length);
      }
      return {
        rides: mapped,
        error: null,
        notice: null,
      };
    }

    if (rpcError) {
      rpcErrorMsg = rpcError.message;
      if (
        isBookingsSchemaMissingMessage(rpcError.message, rpcError.code) ||
        /function .* does not exist|Could not find the function/i.test(
          rpcError.message,
        )
      ) {
        rpcErrorMsg = null;
      }
      console.warn('[useRecentRides] passenger RPC:', rpcError.message);
    } else {
      console.warn('[useRecentRides] passenger RPC empty, trying bookings fallback');
    }
  } catch (e: any) {
    rpcErrorMsg = e?.message ?? 'Error al cargar viajes.';
    console.error('[useRecentRides] fetchPassengerRides RPC EXCEPTION:', e);
  }

  const fallback = await fetchPassengerRidesFromTable(userId, limit);
  if (fallback.rides.length > 0) {
    return { rides: fallback.rides, error: null, notice: fallback.notice };
  }
  if (fallback.error) {
    return { rides: [], error: fallback.error, notice: fallback.notice };
  }
  if (fallback.notice) {
    return { rides: [], error: null, notice: fallback.notice };
  }

  return { rides: [], error: rpcErrorMsg, notice: null };
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
  /** Invalida respuestas obsoletas cuando el efecto se re-ejecuta (focus, rol, etc.). */
  const fetchVersionRef = useRef(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  useEffect(() => {
    console.log('[useRecentRides] useEffect triggered — role:', role, 'userId:', userId?.slice(0, 8));

    if (!role || !userId) {
      fetchVersionRef.current += 1;
      console.log('[useRecentRides] Skipped: role or userId is null');
      setRides([]);
      setLoading(false);
      setError(null);
      setNotice(null);
      return;
    }

    const requestVersion = ++fetchVersionRef.current;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotice(null);

        // Asignación explícita (sin spread): evita que un payload no estándar deje `rides` fuera de `result`.
        let result: { rides: RecentRide[]; error: string | null; notice: string | null };
        if (role === 'conductor') {
          const payload = await fetchDriverRides(userId, limit);
          const ridesList = Array.isArray(payload?.rides) ? payload.rides : [];
          if (__DEV__) {
            console.log('[useRecentRides] payload conductor crudo:', {
              tipo: typeof payload,
              keys: payload && typeof payload === 'object' ? Object.keys(payload as object) : [],
              ridesLen: ridesList.length,
            });
          }
          result = {
            rides: ridesList,
            error: payload?.error ?? null,
            notice: null,
          };
        } else {
          result = await fetchPassengerRides(userId, limit);
          if (!Array.isArray(result.rides)) {
            result = { ...result, rides: [] };
          }
        }

        if (__DEV__) {
          console.log('[useRecentRides] post-fetch', {
            requestVersion,
            versionRef: fetchVersionRef.current,
            role,
            rama: role === 'conductor' ? 'conductor' : 'pasajero',
            ridesRecibidos: result.rides?.length ?? 'sin rides',
            error: result?.error ?? null,
          });
        }

        if (requestVersion !== fetchVersionRef.current) {
          if (__DEV__) {
            console.log('[useRecentRides] respuesta descartada (versión obsoleta)');
          }
          return;
        }
        // Defensivo: aunque las funciones internas siempre devuelven un
        // objeto, blindamos por si alguna mutación futura introduce un
        // null/undefined (caso "rides of null" que estamos rastreando).
        const nextRides = Array.isArray(result?.rides) ? result.rides : [];
        setRides(nextRides);
        setError(result?.error ?? null);
        setNotice(result?.notice ?? null);
        if (__DEV__) {
          console.log('[useRecentRides] estado aplicado — viajes en UI:', nextRides.length);
        }
      } catch (e: any) {
        if (requestVersion !== fetchVersionRef.current) return;
        setRides([]);
        setError(e?.message ?? 'Error inesperado al cargar tus viajes.');
        setNotice(null);
      } finally {
        if (requestVersion === fetchVersionRef.current) {
          setLoading(false);
        }
      }
    };

    run().catch(() => {
      if (requestVersion === fetchVersionRef.current) {
        setLoading(false);
      }
    });

    return () => {
      fetchVersionRef.current += 1;
    };
  }, [role, userId, limit, reloadTick]);

  return { rides, loading, error, notice, reload };
}
