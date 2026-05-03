import { useCallback, useState } from 'react';
import { reverseGeocode, LatLng } from '../../../services/googleMaps';

interface UseReverseGeocodeResult {
  loading: boolean;
  error: string | null;
  resolve: (point: LatLng) => Promise<string | null>;
}

/**
 * Hook on-demand para reverse geocoding. Devuelve la dirección formateada
 * para un par lat/lng. El caller controla cuándo invocarlo (típicamente al
 * arrastrar un pin en el mapa).
 */
export function useReverseGeocode(): UseReverseGeocodeResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(
    async (point: LatLng): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await reverseGeocode(point);
        return result?.formattedAddress ?? null;
      } catch (err: any) {
        setError(err?.message ?? 'Error en reverse geocoding');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, resolve };
}
