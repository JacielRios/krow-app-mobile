import * as Keychain from 'react-native-keychain';
import type { RuntimeCommand } from './protocol';

export interface PendingCommand {
  rideId: string;
  command: RuntimeCommand;
  state: 'pending' | 'conflict';
  createdAt: string;
}
const service = (actorId: string) => `krow.runtime.commands.${actorId}`;
let queue: Promise<unknown> = Promise.resolve();

/** Serialize read/modify/write so concurrent taps cannot overwrite pending commands. */
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}
async function read(actorId: string): Promise<PendingCommand[]> {
  const value = await Keychain.getGenericPassword({
    service: service(actorId),
  });
  return value ? (JSON.parse(value.password) as PendingCommand[]) : [];
}
async function write(actorId: string, commands: PendingCommand[]) {
  if (!commands.length) {
    await Keychain.resetGenericPassword({ service: service(actorId) });
    return;
  }
  await Keychain.setGenericPassword(actorId, JSON.stringify(commands), {
    service: service(actorId),
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}
export const offlineCommands = {
  list: (actorId: string) => exclusive(() => read(actorId)),
  add: (actorId: string, item: PendingCommand) =>
    exclusive(async () => {
      const items = await read(actorId);
      if (items.some(x => x.command.commandId === item.command.commandId))
        return;
      if (items.length >= 100)
        throw new Error(
          'Hay demasiadas acciones pendientes. Reconecta para sincronizar.',
        );
      await write(actorId, [...items, item]);
    }),
  resolve: (actorId: string, id: string) =>
    exclusive(async () =>
      write(
        actorId,
        (await read(actorId)).filter(x => x.command.commandId !== id),
      ),
    ),
  conflict: (actorId: string, id: string) =>
    exclusive(async () =>
      write(
        actorId,
        (await read(actorId)).map(x =>
          x.command.commandId === id ? { ...x, state: 'conflict' } : x,
        ),
      ),
    ),
  conflictRide: (actorId: string, rideId: string) =>
    exclusive(async () =>
      write(
        actorId,
        (await read(actorId)).map(x =>
          x.rideId === rideId ? { ...x, state: 'conflict' } : x,
        ),
      ),
    ),
};
