import { useState } from 'react';
import { supabase } from '../../../services/supabase';

export interface CompleteStopResult {
  success: boolean;
  error: string | null;
}

/**
 * Marca la parada de un pasajero como completada (booking → completed).
 * Si todos los bookings del ride pasan a `completed`, la RPC
 * `complete_stop` automáticamente cambia el ride a `completed`.
 */
export function useCompleteStop() {
  const [loading, setLoading] = useState(false);

  const completeStop = async (
    bookingId: string,
  ): Promise<CompleteStopResult> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('complete_stop', {
        p_booking_id: bookingId,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } finally {
      setLoading(false);
    }
  };

  return { completeStop, loading };
}
