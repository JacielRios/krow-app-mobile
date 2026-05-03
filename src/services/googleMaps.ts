/**
 * Capa cliente para Google Maps Platform (REST APIs).
 *
 * Endpoints usados:
 * - Places Autocomplete: https://maps.googleapis.com/maps/api/place/autocomplete/json
 * - Place Details:       https://maps.googleapis.com/maps/api/place/details/json
 * - Geocoding (reverse): https://maps.googleapis.com/maps/api/geocode/json
 * - Directions:          https://maps.googleapis.com/maps/api/directions/json
 *
 * NOTA DE SEGURIDAD:
 * La API key (`GOOGLE_MAPS_API_KEY`) se inyecta en el bundle desde .env. Para
 * minimizar abuso, en Google Cloud Console se DEBE restringir la key:
 *   - Application restrictions: Android apps (con SHA-1) y iOS bundle id.
 *   - API restrictions: solo Maps SDK + Places + Directions + Geocoding.
 * Si en el futuro se quiere ocultar la key del cliente, se puede mover a una
 * Edge Function de Supabase (proxy) sin tocar este módulo.
 */
import Config from 'react-native-config';

const PLACES_AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

const apiKey = Config.GOOGLE_MAPS_API_KEY?.trim();

if (!apiKey) {
  // No lanzamos en runtime para no romper el bundle si falta la key en dev,
  // pero las funciones rechazan con un error claro.
  console.warn(
    '[googleMaps] GOOGLE_MAPS_API_KEY no definida en .env. Las llamadas a Google Maps fallarán.',
  );
}

function ensureKey(): string {
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY no está configurada en .env.');
  }
  return apiKey;
}

function buildUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join('&');
  return `${base}?${qs}`;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetail {
  placeId: string;
  formattedAddress: string;
  location: LatLng;
}

export interface DirectionsResult {
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
}

/**
 * Sugerencias de Places Autocomplete con sesgo opcional por ubicación.
 *
 * `sessiontoken` se utiliza para agrupar autocomplete + place details en una
 * misma sesión y reducir el costo de billing. El caller debe regenerar el
 * token cada vez que termina una búsqueda (después de un getPlaceDetails).
 */
export async function searchPlaces(
  query: string,
  options: {
    sessionToken?: string;
    language?: string;
    components?: string; // ej. 'country:mx'
    location?: LatLng;
    radiusMeters?: number;
  } = {},
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const url = buildUrl(PLACES_AUTOCOMPLETE_URL, {
    input: trimmed,
    key: ensureKey(),
    sessiontoken: options.sessionToken,
    language: options.language ?? 'es',
    components: options.components ?? 'country:mx',
    location: options.location
      ? `${options.location.lat},${options.location.lng}`
      : undefined,
    radius: options.radiusMeters,
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Places Autocomplete error: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    error_message?: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
      };
    }>;
  };

  if (json.status === 'ZERO_RESULTS') return [];
  if (json.status !== 'OK') {
    throw new Error(
      json.error_message ??
        `Places Autocomplete status: ${json.status}`,
    );
  }

  return (json.predictions ?? []).map(p => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
}

export async function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; language?: string } = {},
): Promise<PlaceDetail> {
  const url = buildUrl(PLACE_DETAILS_URL, {
    place_id: placeId,
    key: ensureKey(),
    fields: 'place_id,formatted_address,geometry/location',
    sessiontoken: options.sessionToken,
    language: options.language ?? 'es',
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Place Details error: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    error_message?: string;
    result?: {
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    };
  };

  if (json.status !== 'OK' || !json.result) {
    throw new Error(
      json.error_message ?? `Place Details status: ${json.status}`,
    );
  }

  return {
    placeId: json.result.place_id,
    formattedAddress: json.result.formatted_address,
    location: {
      lat: json.result.geometry.location.lat,
      lng: json.result.geometry.location.lng,
    },
  };
}

export async function reverseGeocode(point: LatLng): Promise<{
  formattedAddress: string;
  placeId: string | null;
} | null> {
  const url = buildUrl(GEOCODE_URL, {
    latlng: `${point.lat},${point.lng}`,
    key: ensureKey(),
    language: 'es',
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Reverse Geocode error: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{ formatted_address: string; place_id?: string }>;
  };

  if (json.status === 'ZERO_RESULTS') return null;
  if (json.status !== 'OK' || !json.results?.length) {
    throw new Error(
      json.error_message ?? `Reverse Geocode status: ${json.status}`,
    );
  }

  const top = json.results[0];
  return {
    formattedAddress: top.formatted_address,
    placeId: top.place_id ?? null,
  };
}

export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  options: {
    departureTime?: Date;
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    language?: string;
  } = {},
): Promise<DirectionsResult | null> {
  const url = buildUrl(DIRECTIONS_URL, {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: ensureKey(),
    mode: options.mode ?? 'driving',
    language: options.language ?? 'es',
    departure_time: options.departureTime
      ? Math.floor(options.departureTime.getTime() / 1000)
      : undefined,
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Directions error: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    status: string;
    error_message?: string;
    routes?: Array<{
      overview_polyline?: { points: string };
      bounds?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
      legs?: Array<{
        distance: { value: number };
        duration: { value: number };
      }>;
    }>;
  };

  if (json.status === 'ZERO_RESULTS') return null;
  if (json.status !== 'OK' || !json.routes?.length) {
    throw new Error(
      json.error_message ?? `Directions status: ${json.status}`,
    );
  }

  const route = json.routes[0];
  const points = route.overview_polyline?.points;
  if (!points) return null;

  const distanceMeters =
    route.legs?.reduce((acc, leg) => acc + (leg.distance?.value ?? 0), 0) ?? 0;
  const durationSeconds =
    route.legs?.reduce((acc, leg) => acc + (leg.duration?.value ?? 0), 0) ?? 0;

  return {
    encodedPolyline: points,
    distanceMeters,
    durationSeconds,
    bounds: {
      northeast: {
        lat: route.bounds?.northeast.lat ?? destination.lat,
        lng: route.bounds?.northeast.lng ?? destination.lng,
      },
      southwest: {
        lat: route.bounds?.southwest.lat ?? origin.lat,
        lng: route.bounds?.southwest.lng ?? origin.lng,
      },
    },
  };
}

/**
 * Decodifica un polyline encoded de Google
 * (https://developers.google.com/maps/documentation/utilities/polylinealgorithm).
 * Devuelve coordenadas en formato { latitude, longitude } compatible con
 * react-native-maps.
 */
/* eslint-disable no-bitwise */
export function decodePolyline(
  encoded: string,
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Genera un sessionToken UUIDv4 simple (no criptográficamente fuerte) para
 * agrupar Places Autocomplete + Place Details en una misma sesión y reducir
 * el costo de billing.
 */
export function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
/* eslint-enable no-bitwise */
