import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

import { supabase } from '../../../services/supabase';
import type {
  BookingRequest,
  BookingStatus,
  RideHeader,
} from '../types/booking.types';
import { coerceRideStatus } from '../types/ride.types';

interface RawPassenger {
  uuid: string;
  full_name: string | null;
  profile_photo: string | null;
  rating: number | string | null;
}

interface RawBookingRow {
  booking_id: string;
  ride_id: string;
  user_id: string;
  status: BookingStatus;
  seats_reserved: number;
  created_at: string;
  passenger?: RawPassenger | RawPassenger[] | null;
}

interface RawRideRow {
  ride_id: string;
  driver_id: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number | string | null;
  status: string;
  origin_address: string | null;
  destination_address: string | null;
}

const toNum = (v: number | string | null | undefined, fallback = 0): number => {
  if (v == null) return fallback;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const flatten = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const mapBooking = (
  row: RawBookingRow,
  passengerOverride?: RawPassenger | null,
): BookingRequest => {
  const passenger = passengerOverride ?? flatten(row.passenger);
  return {
    bookingId: row.booking_id,
    rideId: row.ride_id,
    status: row.status,
    seatsReserved: row.seats_reserved,
    createdAt: row.created_at,
    passenger: {
      userId: row.user_id,
      fullName: passenger?.full_name ?? null,
      profilePhoto: passenger?.profile_photo ?? null,
      rating: passenger?.rating != null ? toNum(passenger.rating, 0) : null,
    },
  };
};

const mapRide = (row: RawRideRow): RideHeader => ({
  rideId: row.ride_id,
  driverId: row.driver_id,
  departureTime: row.departure_time,
  availableSeats: row.available_seats,
  pricePerSeat: toNum(row.price_per_seat),
  status: coerceRideStatus(row.status),
  originAddress: row.origin_address,
  destinationAddress: row.destination_address,
});

const BOOKING_COLS =
  'booking_id, ride_id, user_id, status, seats_reserved, created_at';

const RIDE_COLS =
  'ride_id, driver_id, departure_time, available_seats, price_per_seat, status, origin_address, destination_address';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed';

export interface UseRideRealtimeResult {
  ride: RideHeader | null;
  bookings: BookingRequest[];
  loading: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  reload: () => void;
}

/**
 * Suscripcion realtime por `rideId` que mantiene en memoria el ride y la
 * lista completa de bookings (todos los estados). A diferencia de
 * `usePendingBookings`, este hook NO refetchea ante cada evento sino que
 * aplica un merge incremental sobre el estado local:
 *   - INSERT: agrega la booking (resolviendo el pasajero on-demand).
 *   - UPDATE: actualiza la booking existente (preservando datos de pasajero).
 *   - DELETE: la elimina del set local.
 *   - UPDATE rides: actualiza solo los campos que cambiaron.
 *
 * Si la suscripcion se cae (CHANNEL_ERROR / TIMED_OUT) se hace polling de
 * respaldo cada 10s hasta reconectar.
 */
export function useRideRealtime(
  rideId: string | null,
): UseRideRealtimeResult {
  const [ride, setRide] = useState<RideHeader | null>(null);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('idle');
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  // Cache de pasajero por user_id para no perder nombre/foto en UPDATE.
  const passengerCacheRef = useRef<Map<string, RawPassenger>>(new Map());
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: RealtimeChannel | null = null;

    if (!rideId) {
      setRide(null);
      setBookings([]);
      setLoading(false);
      setError(null);
      setRealtimeStatus('idle');
      return () => {
        activeRef.current = false;
      };
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [bookingsRes, rideRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(
              `${BOOKING_COLS},
               passenger:users!bookings_user_id_fkey(uuid, full_name, profile_photo, rating)`,
            )
            .eq('ride_id', rideId)
            .order('created_at', { ascending: false }),
          supabase
            .from('rides')
            .select(RIDE_COLS)
            .eq('ride_id', rideId)
            .maybeSingle(),
        ]);

        if (!activeRef.current) return;

        if (bookingsRes.error) {
          setError(bookingsRes.error.message);
          setLoading(false);
          return;
        }
        if (rideRes.error) {
          setError(rideRes.error.message);
          setLoading(false);
          return;
        }

        const rows = (bookingsRes.data ?? []) as RawBookingRow[];
        rows.forEach(r => {
          const p = flatten(r.passenger);
          if (p) passengerCacheRef.current.set(r.user_id, p);
        });
        setBookings(rows.map(r => mapBooking(r)));
        setRide(rideRes.data ? mapRide(rideRes.data as RawRideRow) : null);
        setLoading(false);
      } catch (e: any) {
        if (!activeRef.current) return;
        setError(e?.message ?? 'Error inesperado al cargar el viaje.');
        setLoading(false);
      }
    };

    const fetchPassenger = async (userId: string) => {
      if (passengerCacheRef.current.has(userId)) return;
      const { data } = await supabase
        .from('users')
        .select('uuid, full_name, profile_photo, rating')
        .eq('uuid', userId)
        .maybeSingle();
      if (data) passengerCacheRef.current.set(userId, data as RawPassenger);
    };

    const onBookingsChange = (
      payload: RealtimePostgresChangesPayload<RawBookingRow>,
    ) => {
      if (!activeRef.current) return;
      const newRow = payload.new as RawBookingRow | null;
      const oldRow = payload.old as RawBookingRow | null;

      if (payload.eventType === 'DELETE' && oldRow) {
        setBookings(prev => prev.filter(b => b.bookingId !== oldRow.booking_id));
        return;
      }

      if (!newRow) return;

      const apply = () => {
        const cached = passengerCacheRef.current.get(newRow.user_id) ?? null;
        const mapped = mapBooking(newRow, cached);
        setBookings(prev => {
          const idx = prev.findIndex(b => b.bookingId === newRow.booking_id);
          if (idx >= 0) {
            const next = prev.slice();
            // Preserva passenger info ya cargada si por alguna razon no hay cache.
            next[idx] = {
              ...mapped,
              passenger: cached
                ? mapped.passenger
                : prev[idx].passenger ?? mapped.passenger,
            };
            return next;
          }
          return [mapped, ...prev];
        });
      };

      if (passengerCacheRef.current.has(newRow.user_id)) {
        apply();
      } else {
        // Resolver pasajero asincronamente y luego aplicar.
        fetchPassenger(newRow.user_id).finally(() => {
          if (activeRef.current) apply();
        });
      }
    };

    const onRideChange = (
      payload: RealtimePostgresChangesPayload<RawRideRow>,
    ) => {
      if (!activeRef.current) return;
      const row = payload.new as RawRideRow | null;
      if (!row) return;
      setRide(mapRide(row));
    };

    const setupChannel = () => {
      channel = supabase
        .channel(`ride-realtime:${rideId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `ride_id=eq.${rideId}`,
          },
          onBookingsChange,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rides',
            filter: `ride_id=eq.${rideId}`,
          },
          onRideChange,
        )
        .subscribe(status => {
          if (!activeRef.current) return;
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('reconnecting');
            // Activar polling de respaldo si aún no está activo.
            if (!pollTimer) {
              pollTimer = setInterval(() => {
                if (activeRef.current) fetchAll().catch(() => undefined);
              }, 10_000);
            }
          } else if (status === 'CLOSED') {
            setRealtimeStatus('closed');
          }
        });
    };

    setRealtimeStatus('connecting');
    fetchAll().catch(() => undefined);
    setupChannel();

    return () => {
      activeRef.current = false;
      if (channel) supabase.removeChannel(channel);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [rideId, reloadTick]);

  return { ride, bookings, loading, error, realtimeStatus, reload };
}
