import * as Keychain from 'react-native-keychain';
import { apiBaseUrl } from '../../core/api/apiClient';
import type { BookingNotice } from './pilotApi';

type Receipts = Record<string, number>;
const retention = 8 * 24 * 3600000;
const service = (actor: string) =>
  `krow.booking.seen.v1.${encodeURIComponent(apiBaseUrl())}.${actor}`;
// Only event identifiers and timestamps; passenger/trip information stays remote.
export async function readBookingReceipts(actor: string): Promise<Receipts> {
  const saved = await Keychain.getGenericPassword({ service: service(actor) });
  if (!saved) return {};
  const data: unknown = JSON.parse(saved.password);
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('No se pudieron leer los avisos vistos');
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, at]) =>
        typeof at === 'number' &&
        at <= Date.now() &&
        at > Date.now() - retention,
    ),
  );
}
const writes = new Map<string, Promise<unknown>>();
export function acknowledgeBooking(
  actor: string,
  eventKey: string,
): Promise<Receipts> {
  const previous = writes.get(actor) ?? Promise.resolve();
  const work = previous
    .catch(() => undefined)
    .then(async () => {
      const receipts = await readBookingReceipts(actor);
      receipts[eventKey] = Date.now();
      const saved = await Keychain.setGenericPassword(
        'events',
        JSON.stringify(receipts),
        {
          service: service(actor),
          accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        },
      );
      if (!saved)
        throw new Error(
          'No pudimos guardar la confirmación. Vuelve a intentar.',
        );
      return receipts;
    });
  writes.set(actor, work);
  void work
    .finally(() => {
      if (writes.get(actor) === work) writes.delete(actor);
    })
    .catch(() => undefined);
  return work;
}
export function unseenBookingNotices(
  items: BookingNotice[],
  seen: Receipts,
  postponed: Set<string>,
) {
  return [
    ...new Map(items.map(item => [item.bookingId, item])).values(),
  ].filter(
    item =>
      !postponed.has(item.eventKey) &&
      (item.role === 'driver' ? item.canRespond : !seen[item.eventKey]),
  );
}
