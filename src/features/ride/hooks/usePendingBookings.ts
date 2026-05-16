import { useCallback, useEffect, useRef, useState } from 'react';
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
  status: string;
  seats_reserved: number;
  created_at: string;
  passenger: RawPassenger | RawPassenger[] | null;
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

const flatten = <T>(v: T | T[] | null | undefined): T | null => {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
};

const mapBooking = (row: RawBookingRow): BookingRequest => {
  const passenger = flatten(row.passenger);
  return {
    bookingId: row.booking_id,
    rideId: row.ride_id,
    status: row.status as BookingStatus,
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

export interface UsePendingBookingsResult {
  /** Solicitudes con status='pending' para el ride. */
  pending: BookingRequest[];
  /** Solicitudes con status='confirmed' para el ride. */
  confirmed: BookingRequest[];
  /** Cabecera del ride (con `availableSeats` actualizado en realtime). */
  ride: RideHeader | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Lista las bookings (pending y confirmed) sobre un ride específico, con
 * suscripción Realtime a:
 *   - `bookings` filtrado por `ride_id` (INSERT/UPDATE/DELETE)
 *   - `rides` filtrado por `ride_id` (UPDATE) → para refrescar `available_seats`
 *
 * RLS `bookings_select_parties` ya permite al conductor ver las bookings de
 * sus propios rides; aquí no se hace ningún filtrado adicional client-side.
 */
export function usePendingBookings(
  rideId: string | null,
): UsePendingBookingsResult {
  const [pending, setPending] = useState<BookingRequest[]>([]);
  const [confirmed, setConfirmed] = useState<BookingRequest[]>([]);
  const [ride, setRide] = useState<RideHeader | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    if (!rideId) {
      setPending([]);
      setConfirmed([]);
      setRide(null);
      setLoading(false);
      setError(null);
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
              `booking_id, ride_id, user_id, status, seats_reserved, created_at,
               passenger:users!bookings_user_id_fkey(uuid, full_name, profile_photo, rating)`,
            )
            .eq('ride_id', rideId)
            .in('status', ['pending', 'confirmed'])
            .order('created_at', { ascending: false }),
          supabase
            .from('rides')
            .select(
              'ride_id, driver_id, departure_time, available_seats, price_per_seat, status, origin_address, destination_address',
            )
            .eq('ride_id', rideId)
            .maybeSingle(),
        ]);

        if (!activeRef.current) return;

        if (bookingsRes?.error) {
          setError(bookingsRes.error.message);
          setPending([]);
          setConfirmed([]);
          setLoading(false);
          return;
        }
        if (rideRes?.error) {
          setError(rideRes.error.message);
          setLoading(false);
          return;
        }

        const rows = (bookingsRes?.data ?? []) as RawBookingRow[];
        const mapped = rows.map(mapBooking);
        setPending(mapped.filter(b => b.status === 'pending'));
        setConfirmed(mapped.filter(b => b.status === 'confirmed'));

        setRide(
          rideRes?.data ? mapRide(rideRes.data as RawRideRow) : null,
        );
        setLoading(false);
      } catch (e: any) {
        if (!activeRef.current) return;
        setError(e?.message ?? 'Error inesperado al cargar las solicitudes.');
        setLoading(false);
      }
    };

    // Fire-and-forget: capturamos cualquier rechazo aquí para evitar
    // unhandled promise rejections (RN polyfill los reporta como crashes).
    fetchAll().catch(() => undefined);

    // Realtime: cualquier INSERT/UPDATE/DELETE sobre bookings de este ride o
    // un UPDATE sobre la fila del ride (p.ej. available_seats) dispara una
    // recarga completa. La recarga completa simplifica el join con `users` y
    // mantiene consistencia entre pending/confirmed/ride.
    const channel = supabase
      .channel(`ride-bookings:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `ride_id=eq.${rideId}`,
        },
        () => {
          if (activeRef.current) fetchAll().catch(() => undefined);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `ride_id=eq.${rideId}`,
        },
        () => {
          if (activeRef.current) fetchAll().catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      activeRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [rideId, reloadTick]);

  return { pending, confirmed, ride, loading, error, reload };
}
