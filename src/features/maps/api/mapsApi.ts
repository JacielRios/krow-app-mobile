/** Adaptador móvil de KROW Maps API; no llama directamente a Google REST. */
import { apiQuery, apiRequest } from '../../../core/api/apiClient';

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
  bounds: { northeast: LatLng; southwest: LatLng };
  compatibleStops: TransportStop[];
}
export interface TransportStop {
  stopId: string;
  externalId: string;
  name: string;
  address: string | null;
  municipality: string | null;
  location: LatLng;
  distanceFromRouteMeters: number;
  routeFraction: number;
}

export async function searchPlaces(
  query: string,
  options: {
    sessionToken?: string;
    language?: string;
    components?: string;
    location?: LatLng;
    radiusMeters?: number;
    signal?: AbortSignal;
  } = {},
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const params = apiQuery({
    query: trimmed,
    sessionToken: options.sessionToken,
  });
  const results = await apiRequest<PlaceSuggestion[]>(
    `/maps/places/autocomplete?${params}`,
    {
      signal: options.signal,
    },
  );
  if (
    !Array.isArray(results) ||
    results.some(
      place =>
        !place ||
        typeof place.placeId !== 'string' ||
        !place.placeId ||
        typeof place.description !== 'string' ||
        typeof place.mainText !== 'string' ||
        typeof place.secondaryText !== 'string',
    )
  ) {
    throw new Error(
      'No pudimos leer las direcciones. Intenta buscar de nuevo.',
    );
  }
  return results;
}

export async function getPlaceDetails(
  placeId: string,
  options: {
    sessionToken?: string;
    language?: string;
    signal?: AbortSignal;
  } = {},
): Promise<PlaceDetail> {
  const query = apiQuery({ sessionToken: options.sessionToken });
  const result = await apiRequest<PlaceDetail>(
    `/maps/places/${encodeURIComponent(placeId)}${query ? `?${query}` : ''}`,
    { signal: options.signal },
  );
  if (!result?.placeId || !isValidPoint(result.location)) {
    throw new Error(
      'No pudimos obtener la ubicación de este lugar. Prueba otra dirección.',
    );
  }
  return result;
}

export const isValidPoint = (
  point: LatLng | null | undefined,
): point is LatLng =>
  !!point &&
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lng) <= 180;

export function reverseGeocode(
  point: LatLng,
  options: { signal?: AbortSignal } = {},
): Promise<{ formattedAddress: string; placeId: string | null } | null> {
  return apiRequest('/maps/reverse-geocode', {
    method: 'POST',
    body: JSON.stringify({ point }),
    signal: options.signal,
  });
}

export function getDirections(
  origin: LatLng,
  destination: LatLng,
  options: {
    departureTime?: Date;
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    language?: string;
  } = {},
): Promise<DirectionsResult | null> {
  return apiRequest('/routes/preview', {
    method: 'POST',
    body: JSON.stringify({
      origin,
      destination,
      departureTime: options.departureTime?.toISOString(),
    }),
  });
}

/* eslint-disable no-bitwise */
export function decodePolyline(
  encoded: string,
): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
/* eslint-enable no-bitwise */
