import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CreateRidePayload, CreateRideResult } from '../types/ride.types';

interface UseCreateRideResult {
  createRide: (payload: CreateRidePayload) => Promise<CreateRideResult>;
  loading: boolean;
}

/**
 * Hook sin lógica de navegación: solo encapsula la llamada a la RPC create_ride.
 * La pantalla decide qué hacer con el resultado (navegar, mostrar error, etc.).
 */
export function useCreateRide(): UseCreateRideResult {
  const [loading, setLoading] = useState(false);

  async function createRide(payload: CreateRidePayload): Promise<CreateRideResult> {
    setLoading(true);
    try {
      // supabase.rpc mapea p_payload al parámetro jsonb de la función SQL
      const { data, error } = await supabase.rpc('create_ride', {
        p_payload: payload,
      });

      if (error) {
        return { rideId: null, error: error.message };
      }

      // La RPC retorna el uuid del ride creado
      return { rideId: data as string, error: null };
    } finally {
      setLoading(false);
    }
  }

  return { createRide, loading };
}
