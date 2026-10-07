import { useState } from 'react';
import { rideApi } from '../api/rideApi';
import type { PublishRidePayload, PublishRideResult } from '../types';

interface UsePublishRideResult {
  publishRide: (payload: PublishRidePayload) => Promise<PublishRideResult>;
  loading: boolean;
}

/**
 * Publica un viaje mediante KROW API. El backend recalcula la ruta y la RPC
 * `create_ride_v2` inserta atómicamente el viaje, sus paradas de catálogo y el
 * primer registro de historial.
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
    } catch (error: unknown) {
      return {
        rideId: null,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo publicar el viaje',
      };
    } finally {
      setLoading(false);
    }
  }

  return { publishRide, loading };
}
