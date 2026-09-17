import { useState } from 'react';
import { rideApi } from '../api/rideApi';
import type { PublishRidePayload, PublishRideResult } from '../types';

interface UsePublishRideResult {
  publishRide: (payload: PublishRidePayload) => Promise<PublishRideResult>;
  loading: boolean;
}

/**
 * Publica un ride invocando la RPC `create_ride`. La RPC inserta atómicamente:
 *   - una fila en `rides` con status='scheduled' (default).
 *   - dos filas en `ride_stops`: origen (stop_order=1) y destino (stop_order=2).
 *   - una fila en `ride_status_history` con status='scheduled'.
 *
 * La pantalla decide qué hacer con el resultado (navegar, mostrar error, etc.).
 */
export function usePublishRide(): UsePublishRideResult {
  const [loading, setLoading] = useState(false);

  async function publishRide(
    payload: PublishRidePayload,
  ): Promise<PublishRideResult> {
    setLoading(true);
    try {
      const data = await rideApi.create(payload);
      return { rideId: data.rideId, error: null };
    } catch (error: any) {
      return { rideId: null, error: error?.message ?? 'No se pudo publicar el viaje' };
    } finally {
      setLoading(false);
    }
  }

  return { publishRide, loading };
}
