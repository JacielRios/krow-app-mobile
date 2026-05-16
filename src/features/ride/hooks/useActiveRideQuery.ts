import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import type { SessionLoginMode } from '../../../app/sessionLoginMode';

export interface ActiveRideInfo {
  rideId: string;
  role: SessionLoginMode;
}

export interface UseActiveRideQueryResult {
  activeRide: ActiveRideInfo | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Detecta si el usuario actual tiene un viaje activo (como conductor o
 * pasajero). Útil para auto-redirect desde Home.
 *
 * - Como conductor: ride con status `in_progress` donde el user es el driver.
 * - Como pasajero: booking `confirmed` o `in_progress` en un ride `in_progress`.
 */
export function useActiveRideQuery(): UseActiveRideQueryResult {
  const [activeRide, setActiveRide] = useState<ActiveRideInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let active = true;

    const check = async () => {
      setLoading(true);
      try {
        const authRes = await supabase.auth.getUser();
        const userId = authRes.data.user?.id;
        if (!userId || !active) {
          setActiveRide(null);
          setLoading(false);
          return;
        }

        // 1. Check as driver
        const { data: driverProfile } = await supabase
          .from('driver_profiles')
          .select('driver_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!active) return;

        if (driverProfile?.driver_id) {
          const { data: driverRide } = await supabase
            .from('rides')
            .select('ride_id')
            .eq('driver_id', driverProfile.driver_id)
            .eq('status', 'in_progress')
            .limit(1)
            .maybeSingle();

          if (!active) return;

          if (driverRide) {
            setActiveRide({
              rideId: driverRide.ride_id,
              role: 'conductor',
            });
            setLoading(false);
            return;
          }
        }

        // 2. Check as passenger
        const { data: passengerBooking } = await supabase
          .from('bookings')
          .select(
            `booking_id, ride_id,
             ride:rides!bookings_ride_id_fkey(ride_id, status)`,
          )
          .eq('user_id', userId)
          .in('status', ['confirmed', 'in_progress'])
          .limit(5);

        if (!active) return;

        const activeBooking = (passengerBooking ?? []).find((b: any) => {
          const ride = Array.isArray(b.ride) ? b.ride[0] : b.ride;
          return ride?.status === 'in_progress';
        });

        if (activeBooking) {
          setActiveRide({
            rideId: activeBooking.ride_id,
            role: 'pasajero',
          });
        } else {
          setActiveRide(null);
        }
      } catch {
        if (active) setActiveRide(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    check();

    return () => {
      active = false;
    };
  }, [tick]);

  return { activeRide, loading, reload };
}
