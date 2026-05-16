import { useState } from 'react';
import { supabase } from '../../../services/supabase';

export interface CompleteRideResult {
  success: boolean;
  error: string | null;
}

/**
 * Finaliza un viaje (in_progress -> completed). Solo el conductor.
 */
export function useCompleteRide() {
  const [loading, setLoading] = useState(false);

  const completeRide = async (rideId: string): Promise<CompleteRideResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('complete_ride', {
        p_ride_id: rideId,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } finally {
      setLoading(false);
    }
  };

  return { completeRide, loading };
}
