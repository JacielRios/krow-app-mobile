import { useEffect, useRef, useState } from 'react';
import {
  searchPlaces,
  generateSessionToken,
  PlaceSuggestion,
  LatLng,
} from '../../../services/googleMaps';

export interface UsePlacesAutocompleteOptions {
  debounceMs?: number;
  /** Resultados solo del país especificado. Default 'mx'. */
  countryCode?: string;
  /** Sesgo geográfico opcional para priorizar cercanía. */
  bias?: LatLng | null;
  biasRadiusMeters?: number;
  /** Si false, deshabilita el hook (no dispara fetches). */
  enabled?: boolean;
}

export interface UsePlacesAutocompleteResult {
  query: string;
  setQuery: (q: string) => void;
  suggestions: PlaceSuggestion[];
  loading: boolean;
  error: string | null;
  /**
   * Token de sesión actual para asociar con `getPlaceDetails`.
   * Después de elegir una sugerencia llama a `consumeSession()` para rotarlo.
   */
  sessionToken: string;
  consumeSession: () => void;
  reset: () => void;
}

/**
 * Hook con debouncing para Places Autocomplete.
 * Genera un sessionToken por sesión de búsqueda y lo rota cuando el caller
 * confirma una selección (consumeSession), reduciendo el costo de Places API.
 */
export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {},
): UsePlacesAutocompleteResult {
  const {
    debounceMs = 300,
    countryCode = 'mx',
    bias = null,
    biasRadiusMeters = 50000,
    enabled = true,
  } = options;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState(() =>
    generateSessionToken(),
  );

  // Mantener referencia del ultimo fetch para descartar respuestas obsoletas
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const myRequestId = ++requestIdRef.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchPlaces(trimmed, {
          sessionToken,
          components: countryCode ? `country:${countryCode}` : undefined,
          location: bias ?? undefined,
          radiusMeters: bias ? biasRadiusMeters : undefined,
        });
        if (myRequestId === requestIdRef.current) {
          setSuggestions(results);
        }
      } catch (err: any) {
        if (myRequestId === requestIdRef.current) {
          setError(err?.message ?? 'Error al buscar lugares');
          setSuggestions([]);
        }
      } finally {
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(handle);
    // bias se observa via lat/lng escalares para evitar re-renders por nueva ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    debounceMs,
    countryCode,
    bias?.lat,
    bias?.lng,
    biasRadiusMeters,
    enabled,
    sessionToken,
  ]);

  const consumeSession = () => {
    setSessionToken(generateSessionToken());
  };

  const reset = () => {
    setQuery('');
    setSuggestions([]);
    setError(null);
  };

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    sessionToken,
    consumeSession,
    reset,
  };
}
