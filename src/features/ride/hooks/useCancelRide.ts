import { useState } from 'react';
import { supabase } from '../../../services/supabase';

export interface CancelRideResult {
  success: boolean;
  error: string | null;
}

/**
 * Cancela un viaje (scheduled|in_progress -> cancelled). Solo el conductor.
 * Restaura asientos de confirmados y pasa bookings activas a `cancelled`.
 */
export function useCancelRide() {
  const [loading, setLoading] = useState(false);

  const cancelRide = async (
    rideId: string,
    reason?: string,
  ): Promise<CancelRideResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('cancel_ride', {
        p_ride_id: rideId,
        p_reason: reason ?? null,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } finally {
      setLoading(false);
    }
  };

  return { cancelRide, loading };
}
