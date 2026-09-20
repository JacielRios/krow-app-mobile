import { useState } from 'react';
import { bookingApi } from '../api/bookingApi';
import type {
  RequestBookingPayload,
  RequestBookingResult,
} from '../types/booking.types';

interface UseRequestBookingResult {
  requestBooking: (
    payload: RequestBookingPayload,
  ) => Promise<RequestBookingResult>;
  loading: boolean;
}

/**
 * Hook que solicita una reserva con subida y bajada explícitas.
 *
 * Además, la RPC valida server-side:
 *   - que el ride exista, esté 'scheduled' y no haya partido.
 *   - que haya asientos suficientes.
 *   - que el solicitante NO sea el conductor del ride.
 *   - que el solicitante NO tenga ya una booking activa (pending|confirmed)
 *     para ese ride.
 */
export function useRequestBooking(): UseRequestBookingResult {
  const [loading, setLoading] = useState(false);

  async function requestBooking(
    payload: RequestBookingPayload,
  ): Promise<RequestBookingResult> {
    setLoading(true);
    try {
      const data = await bookingApi.request(
        payload.ride_id,
        payload.pickup_stop_id,
        payload.dropoff_stop_id,
        payload.seats_reserved ?? 1,
      );
      return { bookingId: data.bookingId, error: null };
    } catch (error: any) {
      return { bookingId: null, error: error?.message ?? 'No se pudo solicitar el viaje' };
    } finally {
      setLoading(false);
    }
  }

  return { requestBooking, loading };
}
