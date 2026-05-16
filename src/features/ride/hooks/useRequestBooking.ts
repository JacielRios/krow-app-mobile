import { useState } from 'react';
import { supabase } from '../../../services/supabase';
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
 * Hook que invoca la RPC `request_booking`.
 *
 * La RPC resuelve internamente los `stop_id` de pickup y dropoff a partir de
 * los `ride_stops` ya creados al publicar el ride (stop_order = 1 origen,
 * stop_order = 2 destino). Por eso el cliente solo necesita pasar `ride_id` y
 * (opcionalmente) `seats_reserved`.
 *
 * Además, la RPC valida server-side:
 *   - que el ride exista, esté en fase previa (`open`|`full`) y pueda admitir solicitud según reglas server-side.
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
      const { data, error } = await supabase.rpc('request_booking', {
        p_payload: payload,
      });

      if (error) {
        return { bookingId: null, error: error.message };
      }

      return { bookingId: data as string, error: null };
    } finally {
      setLoading(false);
    }
  }

  return { requestBooking, loading };
}
