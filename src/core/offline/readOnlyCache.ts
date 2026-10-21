import * as Keychain from 'react-native-keychain';
import { ApiError, apiBaseUrl } from '../api/apiClient';

type Resource =
  | 'profile'
  | `activity.${'driver' | 'passenger'}.${'upcoming' | 'active' | 'history'}`;
export interface ReadResult<T> {
  data: T;
  source: 'network' | 'cache';
  savedAt: number;
}
const maxAge = 24 * 60 * 60 * 1000;
const epochs = new Map<string, number>();
let queue: Promise<unknown> = Promise.resolve();
const serialize = <T>(work: () => Promise<T>): Promise<T> => {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
};
const service = (actor: string, resource: Resource) =>
  `krow.readonly.v1.${encodeURIComponent(apiBaseUrl())}.${actor}.${resource}`;
const resources: Resource[] = [
  'profile',
  ...(['driver', 'passenger'] as const).flatMap(context =>
    (['upcoming', 'active', 'history'] as const).map(
      group => `activity.${context}.${group}` as Resource,
    ),
  ),
];

export function clearReadOnlyActor(actor: string) {
  epochs.set(actor, (epochs.get(actor) ?? 0) + 1);
  return serialize(async () => {
    await Promise.allSettled(
      resources.map(resource =>
        Keychain.resetGenericPassword({ service: service(actor, resource) }),
      ),
    );
  });
}

export async function readWithCache<T>(
  actor: string,
  resource: Resource,
  load: () => Promise<T>,
  valid: (data: unknown) => data is T,
): Promise<ReadResult<T>> {
  const epoch = epochs.get(actor) ?? 0;
  const current = () => epoch === (epochs.get(actor) ?? 0);
  try {
    const data = await load();
    if (!valid(data))
      throw new Error(
        'La información recibida no es válida para esta consulta.',
      );
    const savedAt = Date.now();
    const body = JSON.stringify({ version: 1, actor, resource, savedAt, data });
    if (body.length <= 48000) {
      await serialize(async () => {
        if (!current()) return;
        await Keychain.setGenericPassword(actor, body, {
          service: service(actor, resource),
          accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      }).catch(() => undefined);
    }
    return { data, source: 'network', savedAt };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      await clearReadOnlyActor(actor).catch(() => undefined);
    // HTTP errors and cancellations cannot revive a previously authorized view.
    if (
      !(error instanceof ApiError) ||
      ![0, 408].includes(error.status) ||
      !current()
    )
      throw error;
    const cached = await serialize(async () => {
      try {
        const saved = await Keychain.getGenericPassword({
          service: service(actor, resource),
        });
        if (!saved || !current() || saved.password.length > 48000) return null;
        const value: unknown = JSON.parse(saved.password);
        if (
          !value ||
          typeof value !== 'object' ||
          !('version' in value) ||
          value.version !== 1 ||
          !('actor' in value) ||
          value.actor !== actor ||
          !('resource' in value) ||
          value.resource !== resource ||
          !('savedAt' in value) ||
          typeof value.savedAt !== 'number' ||
          !Number.isFinite(value.savedAt) ||
          value.savedAt > Date.now() ||
          Date.now() - value.savedAt > maxAge ||
          !('data' in value) ||
          !valid(value.data)
        )
          return null;
        return {
          data: value.data,
          source: 'cache' as const,
          savedAt: value.savedAt,
        };
      } catch {
        return null;
      }
    });
    if (!cached || !current()) throw error;
    return cached;
  }
}
