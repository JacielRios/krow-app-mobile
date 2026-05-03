import { useState } from 'react';
import { supabase } from '../../../services/supabase';
import type {
  BookingMutableStatus,
  UpdateBookingStatusResult,
} from '../types/booking.types';

interface UseUpdateBookingStatusResult {
  updateStatus: (
    bookingId: string,
    newStatus: BookingMutableStatus,
  ) => Promise<UpdateBookingStatusResult>;
  loading: boolean;
}

/**
 * Hook que invoca la RPC `update_booking_status`.
 * - Conductor → 'confirmed' o 'cancelled'
 * - Pasajero  → 'cancelled' (la RPC hace cumplir las reglas server-side).
 *
 * Cuando se confirma, la RPC decrementa `rides.available_seats`.
 * Cuando se cancela una booking confirmada, restaura asientos.
 */
export function useUpdateBookingStatus(): UseUpdateBookingStatusResult {
  const [loading, setLoading] = useState(false);

  async function updateStatus(
    bookingId: string,
    newStatus: BookingMutableStatus,
  ): Promise<UpdateBookingStatusResult> {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } finally {
      setLoading(false);
    }
  }

  return { updateStatus, loading };
}
