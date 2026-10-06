import * as Keychain from 'react-native-keychain';
import type { RuntimeSnapshot } from './protocol';
const service = (actor: string, ride: string) =>
  `krow.runtime.snapshot.${actor}.${ride}`;
export const sessionCache = {
  async read(actor: string, ride: string): Promise<RuntimeSnapshot | null> {
    const saved = await Keychain.getGenericPassword({
      service: service(actor, ride),
    });
    if (!saved) return null;
    const value = JSON.parse(saved.password) as RuntimeSnapshot;
    // Offline copies cannot authorize real-time access and must not show a live fix.
    if (
      value.rideId !== ride ||
      Date.now() - Date.parse(value.generatedAt) > 86400000
    )
      return null;
    return {
      ...value,
      tracking: value.position ? 'stale' : 'unavailable',
      etaSeconds: null,
      remainingMeters: null,
    };
  },
  async write(actor: string, value: RuntimeSnapshot) {
    if (['completed', 'cancelled', 'interrupted'].includes(value.state)) {
      await Keychain.resetGenericPassword({
        service: service(actor, value.rideId),
      });
      return;
    }
    await Keychain.setGenericPassword(actor, JSON.stringify(value), {
      service: service(actor, value.rideId),
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
};
