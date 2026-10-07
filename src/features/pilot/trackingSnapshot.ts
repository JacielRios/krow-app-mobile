import { isValidPoint } from '../maps/api/mapsApi';
import type { OperationalStop, TrackingSnapshot } from './pilotApi';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const participants = (value: unknown): OperationalStop['pickups'] =>
  (Array.isArray(value) ? value : []).filter(
    participant =>
      record(participant) &&
      typeof participant.bookingId === 'string' &&
      !!participant.bookingId &&
      typeof participant.name === 'string',
  );
const stop = (value: unknown): OperationalStop | null => {
  if (
    !record(value) ||
    !isValidPoint(value as unknown as OperationalStop) ||
    typeof value.stopId !== 'string' ||
    !value.stopId ||
    typeof value.address !== 'string'
  )
    return null;
  return {
    stopId: value.stopId,
    order:
      typeof value.order === 'number' && Number.isFinite(value.order)
        ? value.order
        : 0,
    lat: value.lat as number,
    lng: value.lng as number,
    address: value.address,
    pickups: participants(value.pickups),
    dropoffs: participants(value.dropoffs),
  };
};

/** REST and socket messages share one boundary before any native map render. */
export function readTrackingSnapshot(
  value: unknown,
  rideId: string,
): TrackingSnapshot {
  if (
    !record(value) ||
    value.rideId !== rideId ||
    !['driver', 'passenger'].includes(String(value.role))
  )
    throw new Error('No pudimos leer el seguimiento de este viaje. Reintenta.');
  const candidate = value.position;
  const validPosition =
    record(candidate) &&
    isValidPoint(candidate as unknown as TrackingSnapshot['position']) &&
    typeof candidate.capturedAt === 'string' &&
    Number.isFinite(Date.parse(candidate.capturedAt)) &&
    typeof candidate.accuracy === 'number' &&
    Number.isFinite(candidate.accuracy) &&
    candidate.accuracy >= 0;
  const position = validPosition
    ? {
        ...(candidate as unknown as NonNullable<TrackingSnapshot['position']>),
        heading:
          typeof candidate.heading === 'number' &&
          Number.isFinite(candidate.heading)
            ? candidate.heading
            : undefined,
      }
    : null;
  const route = record(value.route) ? value.route : {};
  const place = (input: unknown): TrackingSnapshot['myStop'] =>
    record(input) &&
    isValidPoint(input as unknown as OperationalStop) &&
    typeof input.address === 'string'
      ? {
          lat: input.lat as number,
          lng: input.lng as number,
          address: input.address,
        }
      : null;
  return {
    rideId,
    role: value.role as TrackingSnapshot['role'],
    observedAt:
      typeof value.observedAt === 'string' ? value.observedAt : undefined,
    position,
    state: position
      ? (value.state as TrackingSnapshot['state'])
      : 'unavailable',
    ageSeconds:
      typeof value.ageSeconds === 'number' && Number.isFinite(value.ageSeconds)
        ? value.ageSeconds
        : null,
    route: {
      polyline: typeof route.polyline === 'string' ? route.polyline : null,
      durationSeconds:
        typeof route.durationSeconds === 'number' &&
        Number.isFinite(route.durationSeconds)
          ? route.durationSeconds
          : 0,
      version: typeof route.version === 'string' ? route.version : '',
      error:
        typeof route.error === 'string'
          ? route.error
          : !record(value.route)
          ? 'No pudimos cargar la ruta. Puedes reintentar el seguimiento.'
          : null,
    },
    stops: (Array.isArray(value.stops) ? value.stops : [])
      .map(stop)
      .filter((item): item is OperationalStop => item !== null),
    nextStop: stop(value.nextStop),
    myStop: place(value.myStop),
    myPickup: place(value.myPickup),
    nextAction:
      value.nextAction === 'pickup' || value.nextAction === 'dropoff'
        ? value.nextAction
        : null,
    etaSeconds:
      position &&
      typeof value.etaSeconds === 'number' &&
      Number.isFinite(value.etaSeconds) &&
      value.etaSeconds >= 0
        ? value.etaSeconds
        : null,
    canComplete: value.canComplete === true,
  };
}
