import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../../../services/supabase';
import type { BookingStatus } from '../types/booking.types';
import { coerceRideStatus, type RideStatus } from '../types/ride.types';

export interface MyBookingState {
  bookingId: string;
  rideId: string;
  status: BookingStatus;
  seatsReserved: number;
  createdAt: string;
  ride: {
    rideId: string;
    status: RideStatus;
    departureTime: string;
    originAddress: string | null;
    destinationAddress: string | null;
    pricePerSeat: number;
    routePolyline: string | null;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    driver: {
      driverId: string;
      fullName: string | null;
      profilePhoto: string | null;
      rating: number | null;
      vehicle: {
        brand: string | null;
        model: string | null;
        carColor: string | null;
        licensePlate: string | null;
      } | null;
    };
  };
}

export interface UseMyBookingResult {
  booking: MyBookingState | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface RawBookingRow {
  booking_id: string;
  ride_id: string;
  status: BookingStatus;
  seats_reserved: number;
  created_at: string;
}

/**
 * Suscripcion realtime al estado de la booking del pasajero. Util para la
 * pantalla de espera (PassengerWaitingScreen): cuando el conductor confirma,
 * rechaza o cancela, el pasajero recibe el evento y la UI reacciona sin
 * necesidad de hacer pull-to-refresh.
 */
export function useMyBooking(bookingId: string | null): UseMyBookingResult {
  const [booking, setBooking] = useState<MyBookingState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      setError(null);
      return () => {
        activeRef.current = false;
      };
    }

    let channel: RealtimeChannel | null = null;

    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: bookingError } = await supabase
          .from('bookings')
          .select(
            `booking_id, ride_id, status, seats_reserved, created_at,
             ride:rides!bookings_ride_id_fkey(
               ride_id, status, departure_time, origin_address, destination_address,
               price_per_seat, route_polyline, origin_lat, origin_lng,
               destination_lat, destination_lng, driver_id,
               driver:driver_profiles!rides_driver_id_fkey(
                 driver_id, rating,
                 user:users!driver_profiles_user_id_fkey(uuid, full_name, profile_photo)
               ),
               vehicle:vehicles!rides_vehicle_id_fkey(brand, model, car_color, license_plate)
             )`,
          )
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (!activeRef.current) return;

        if (bookingError) {
          setError(bookingError.message);
          setLoading(false);
          return;
        }
        if (!data) {
          setBooking(null);
          setLoading(false);
          return;
        }

        const row: any = data;
        const rideRow = Array.isArray(row.ride) ? row.ride[0] : row.ride;
        if (!rideRow) {
          setBooking(null);
          setLoading(false);
          return;
        }
        const driverProfile = Array.isArray(rideRow.driver)
          ? rideRow.driver[0]
          : rideRow.driver;
        const driverUser = Array.isArray(driverProfile?.user)
          ? driverProfile.user[0]
          : driverProfile?.user;
        const vehicle = Array.isArray(rideRow.vehicle)
          ? rideRow.vehicle[0]
          : rideRow.vehicle;

        setBooking({
          bookingId: row.booking_id,
          rideId: row.ride_id,
          status: row.status,
          seatsReserved: row.seats_reserved,
          createdAt: row.created_at,
          ride: {
            rideId: rideRow.ride_id,
            status: coerceRideStatus(rideRow.status),
            departureTime: rideRow.departure_time,
            originAddress: rideRow.origin_address,
            destinationAddress: rideRow.destination_address,
            pricePerSeat: Number(rideRow.price_per_seat ?? 0),
            routePolyline: rideRow.route_polyline,
            originLat: Number(rideRow.origin_lat),
            originLng: Number(rideRow.origin_lng),
            destinationLat: Number(rideRow.destination_lat),
            destinationLng: Number(rideRow.destination_lng),
            driver: {
              driverId: driverProfile?.driver_id ?? rideRow.driver_id,
              fullName: driverUser?.full_name ?? null,
              profilePhoto: driverUser?.profile_photo ?? null,
              rating:
                driverProfile?.rating != null
                  ? Number(driverProfile.rating)
                  : null,
              vehicle: vehicle
                ? {
                    brand: vehicle.brand ?? null,
                    model: vehicle.model ?? null,
                    carColor: vehicle.car_color ?? null,
                    licensePlate: vehicle.license_plate ?? null,
                  }
                : null,
            },
          },
        });
        setLoading(false);
      } catch (e: any) {
        if (!activeRef.current) return;
        setError(e?.message ?? 'No se pudo cargar la reserva.');
        setLoading(false);
      }
    };

    fetchBooking().catch(() => undefined);

    // Realtime: nos interesa cualquier cambio sobre nuestra booking y sobre el
    // ride asociado (por si el conductor inicia/cancela).
    channel = supabase
      .channel(`my-booking:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          const row = payload?.new as RawBookingRow | null;
          if (!row || !activeRef.current) return;
          setBooking(prev =>
            prev
              ? {
                  ...prev,
                  status: row.status,
                  seatsReserved: row.seats_reserved,
                }
              : prev,
          );
        },
      )
      .subscribe();

    return () => {
      activeRef.current = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId, tick]);

  // Suscribirse al estado del ride asociado para detectar in_progress / completed / cancelled
  useEffect(() => {
    if (!booking?.rideId) return;
    const rideId = booking.rideId;

    const channel = supabase
      .channel(`my-booking-ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (!row || !activeRef.current) return;
          setBooking(prev =>
            prev
              ? {
                  ...prev,
                  ride: {
                    ...prev.ride,
                    status: coerceRideStatus(row.status),
                  },
                }
              : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.rideId]);

  return { booking, loading, error, reload };
}
