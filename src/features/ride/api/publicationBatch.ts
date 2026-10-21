import * as Keychain from 'react-native-keychain';
import { apiBaseUrl } from '../../../core/api/apiClient';
import { newCommandId } from '../../ride-runtime/runtimeApi';
import { rideApi } from './rideApi';
import type { PublishRidePayload } from '../types';

export interface PublicationBatch {
  version: 1;
  identity: string;
  payload: PublishRidePayload;
  entries: Array<{
    date: string;
    requestId: string;
    rideId: string | null;
    skipped?: boolean;
  }>;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const options = (actorId: string) => ({
  service: `krow.ride.batch.${encodeURIComponent(apiBaseUrl())}.${actorId}`,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});
export async function readPublicationBatch(
  actorId: string,
): Promise<PublicationBatch | null> {
  const saved = await Keychain.getGenericPassword(options(actorId));
  if (!saved) return null;
  const value = JSON.parse(saved.password) as PublicationBatch;
  if (
    value.version !== 1 ||
    typeof value.identity !== 'string' ||
    !value.payload ||
    !Array.isArray(value.entries) ||
    !value.entries.length ||
    value.entries.length > 28 ||
    value.entries.some(
      e =>
        !Number.isFinite(Date.parse(e.date)) ||
        !uuid.test(e.requestId) ||
        (e.rideId !== null && !uuid.test(e.rideId)),
    )
  )
    throw new Error('No pudimos recuperar las publicaciones pendientes.');
  return value;
}
const save = async (actorId: string, batch: PublicationBatch) => {
  if (
    !(await Keychain.setGenericPassword(
      'batch',
      JSON.stringify(batch),
      options(actorId),
    ))
  )
    throw new Error('No pudimos guardar el avance de forma segura.');
};
export const batchPending = (batch: PublicationBatch) =>
  batch.entries.some(e => !e.rideId && !e.skipped);
let queue: Promise<unknown> = Promise.resolve();

// One explicit online operation per departure, with all request IDs durable
// before the first HTTP request. Partial success is retained, never rolled back.
export function publishRideBatch(
  actorId: string,
  selection?: { payload: PublishRidePayload; dates: string[] },
  onProgress?: (batch: PublicationBatch) => void,
): Promise<{ batch: PublicationBatch; error: string | null }> {
  const work = async () => {
    let batch = await readPublicationBatch(actorId);
    if (selection) {
      const dates = [...new Set(selection.dates)].sort();
      if (
        !dates.length ||
        dates.length > 28 ||
        dates.some(d => !Number.isFinite(Date.parse(d)))
      )
        throw new Error('Revisa las fechas antes de publicar.');
      const identity = JSON.stringify({ payload: selection.payload, dates });
      if (batch?.identity !== identity) {
        if (batch && batchPending(batch))
          throw new Error(
            'Retoma o finaliza primero las publicaciones pendientes.',
          );
        batch = {
          version: 1,
          identity,
          payload: selection.payload,
          entries: dates.map(date => ({
            date,
            requestId: newCommandId(),
            rideId: null,
          })),
        };
        await save(actorId, batch);
      }
    }
    if (!batch) throw new Error('No hay publicaciones pendientes.');
    try {
      for (const entry of batch.entries) {
        if (entry.rideId || entry.skipped) continue;
        if (Date.parse(entry.date) <= Date.now() + 15 * 60 * 1000) {
          entry.skipped = true;
        } else {
          const result = await rideApi.create(
            { ...batch.payload, departure_time: entry.date },
            { requestId: entry.requestId, actorId },
          );
          entry.rideId = result.rideId;
        }
        await save(actorId, batch);
        onProgress?.({ ...batch, entries: batch.entries.map(e => ({ ...e })) });
      }
      return { batch, error: null };
    } catch (error) {
      return {
        batch,
        error:
          error instanceof Error
            ? error.message
            : 'Se interrumpió la publicación. Retoma el intento.',
      };
    }
  };
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}
export async function finishPublicationBatch(actorId: string) {
  await Keychain.resetGenericPassword(options(actorId));
}
