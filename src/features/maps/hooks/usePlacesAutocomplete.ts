import { useCallback, useEffect, useRef, useState } from 'react';
import {
  searchPlaces,
  generateSessionToken,
  PlaceSuggestion,
  LatLng,
} from '../api/mapsApi';

export interface UsePlacesAutocompleteOptions {
  debounceMs?: number;
  countryCode?: string;
  bias?: LatLng | null;
  biasRadiusMeters?: number;
  enabled?: boolean;
}
export interface UsePlacesAutocompleteResult {
  query: string;
  setQuery: (query: string) => void;
  suggestions: PlaceSuggestion[];
  loading: boolean;
  error: string | null;
  sessionToken: string;
  consumeSession: () => void;
  reset: () => void;
  retry: () => void;
}

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {},
): UsePlacesAutocompleteResult {
  const {
    debounceMs = 300,
    countryCode = 'mx',
    biasRadiusMeters = 50000,
    enabled = true,
  } = options;
  const latitude = options.bias?.lat,
    longitude = options.bias?.lng;
  const [query, updateQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState(generateSessionToken);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const active = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => {
    generation.current += 1;
    active.current?.abort();
  }, []);
  const setQuery = useCallback(
    (next: string) => {
      invalidate();
      updateQuery(next);
      setAttempt(value => value + 1);
      setSuggestions([]);
      setError(null);
      setLoading(false);
    },
    [invalidate],
  );
  const reset = useCallback(() => setQuery(''), [setQuery]);
  const consumeSession = useCallback(() => {
    reset();
    setSessionToken(generateSessionToken());
  }, [reset]);
  const retry = useCallback(() => {
    invalidate();
    setAttempt(value => value + 1);
  }, [invalidate]);

  useEffect(() => {
    invalidate();
    const request = generation.current;
    setLoading(false);
    setSuggestions([]);
    setError(null);
    if (!enabled || query.trim().length < 2) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const timer = setTimeout(async () => {
      if (request !== generation.current || controller.signal.aborted) return;
      try {
        const results = await searchPlaces(query.trim(), {
          sessionToken,
          components: countryCode ? `country:${countryCode}` : undefined,
          location:
            latitude != null && longitude != null
              ? { lat: latitude, lng: longitude }
              : undefined,
          radiusMeters: biasRadiusMeters,
          signal: controller.signal,
        });
        if (request === generation.current && !controller.signal.aborted)
          setSuggestions(results);
      } catch (cause) {
        if (request === generation.current && !controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No pudimos buscar direcciones. Intenta de nuevo.',
          );
        }
      } finally {
        if (request === generation.current && !controller.signal.aborted)
          setLoading(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [
    query,
    debounceMs,
    countryCode,
    latitude,
    longitude,
    biasRadiusMeters,
    enabled,
    sessionToken,
    attempt,
    invalidate,
  ]);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    sessionToken,
    consumeSession,
    reset,
    retry,
  };
}
