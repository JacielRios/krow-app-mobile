import { useState } from 'react';
import { bookingApi } from '../api/bookingApi';
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
      await bookingApi.updateStatus(bookingId, newStatus);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'No se pudo actualizar la reserva' };
    } finally {
      setLoading(false);
    }
  }

  return { updateStatus, loading };
}
