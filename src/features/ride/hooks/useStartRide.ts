import { useState } from 'react';
import { supabase } from '../../../services/supabase';

export interface StartRideResult {
  success: boolean;
  error: string | null;
}

/**
 * Inicia un viaje (scheduled -> in_progress). RPC `start_ride`: el conductor
 * debe ser el dueño del ride; las bookings `pending` pasan a `cancelled`.
 */
export function useStartRide() {
  const [loading, setLoading] = useState(false);

  const startRide = async (rideId: string): Promise<StartRideResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('start_ride', { p_ride_id: rideId });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } finally {
      setLoading(false);
    }
  };

  return { startRide, loading };
}
