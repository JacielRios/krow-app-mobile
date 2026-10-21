import * as Keychain from 'react-native-keychain';
import { newCommandId } from '../../ride-runtime/runtimeApi';
import type { PublishRidePayload } from '../types/ride.types';

let queue: Promise<unknown> = Promise.resolve();

// Keep the last intent across timeouts, remounts and process restarts. Exact
// repeats recover the original trip; changing the form creates a new intent.
export function publicationRequestId(
  actorId: string,
  payload: PublishRidePayload,
): Promise<string> {
  const work = async () => {
    const identity = JSON.stringify({
      vehicleId: payload.vehicle_id,
      corridorId: payload.corridor_id ?? null,
      favoriteRouteId: payload.favorite_route_id ?? null,
      destination: {
        lat: payload.destination_lat,
        lng: payload.destination_lng,
      },
      destinationAddress: payload.destination_address?.trim() || null,
      departureTime: new Date(payload.departure_time).toISOString(),
      availableSeats: payload.available_seats,
      pricePerSeatCents: Math.round(payload.price_per_seat * 100),
      transportStopIds: payload.transport_stop_ids,
    });
    const options = {
      service: `krow.ride.publication.${actorId}`,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    };
    const saved = await Keychain.getGenericPassword(options);
    if (saved) {
      let entry: unknown;
      try {
        entry = JSON.parse(saved.password);
      } catch {
        throw new Error('No pudimos recuperar la solicitud de publicación.');
      }
      if (
        !entry ||
        typeof entry !== 'object' ||
        !('identity' in entry) ||
        !('requestId' in entry) ||
        typeof entry.identity !== 'string' ||
        typeof entry.requestId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          entry.requestId,
        )
      )
        throw new Error('No pudimos recuperar la solicitud de publicación.');
      if (entry.identity === identity) return entry.requestId;
    }
    const requestId = newCommandId();
    if (
      !(await Keychain.setGenericPassword(
        'publication',
        JSON.stringify({ identity, requestId }),
        options,
      ))
    )
      throw new Error(
        'No pudimos guardar la solicitud de forma segura. Reintenta antes de publicar.',
      );
    return requestId;
  };
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}
