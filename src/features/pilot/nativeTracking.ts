import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBaseUrl } from '../../core/api/apiClient';
import { pilotApi } from './pilotApi';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
// getRandomValues is initialized by index.js before application imports.
export function newId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(
    16,
    20,
  )}-${h.slice(20)}`;
}
type NativeTracking = {
  start: (config: string) => Promise<boolean>;
  stop: () => Promise<boolean>;
  stopSession: (sessionId: string) => Promise<boolean>;
  status: () => Promise<{
    rideId: string | null;
    sessionId: string | null;
    error: string | null;
  }>;
};
const native = NativeModules.KrowPilotTracking as NativeTracking | undefined;
let generation = 0;
let starting: { rideId: string; promise: Promise<void> } | null = null;
// Session creation replaces the previous server upload session. A request that
// was already sent cannot be rolled back by leaving the screen, so a successor
// waits for that request before creating its own session.
let sessionCreation: Promise<void> = Promise.resolve();

async function revokeSession(
  url: string,
  session: { sessionId: string; uploadToken: string },
) {
  // This credential can close only its own upload session, including after logout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${url}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        uploadToken: session.uploadToken,
      }),
      signal: controller.signal,
    });
  } catch {
    // The server also revokes on terminal ride commands and session expiry.
  } finally {
    clearTimeout(timeout);
  }
}
async function prepareTracking() {
  if (
    Platform.OS !== 'android' ||
    !native ||
    ['start', 'status', 'stop', 'stopSession'].some(
      method => typeof native[method as keyof NativeTracking] !== 'function',
    )
  )
    throw new Error(
      'El seguimiento del piloto requiere Android y una compilación nativa actualizada.',
    );
  const grants = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  if (
    grants[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
    PermissionsAndroid.RESULTS.GRANTED
  )
    throw new Error(
      'Permite la ubicación precisa para compartir el GPS del viaje.',
    );
  if (Number(Platform.Version) >= 33)
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
}
export const pilotTracking = {
  prepare: prepareTracking,
  cancelStart: (rideId: string) => {
    if (starting?.rideId !== rideId) return;
    generation += 1;
    starting = null;
  },
  status: () =>
    (typeof native?.status === 'function' ? native.status() : undefined) ??
    Promise.resolve({ rideId: null, sessionId: null, error: null }),
  stop: async (rideId?: string) => {
    if (!rideId || starting?.rideId === rideId) {
      generation += 1;
      starting = null;
    }
    if (!rideId) {
      await native?.stop();
      return;
    }
    const current = await native?.status();
    if (current?.rideId === rideId && current.sessionId)
      await native?.stopSession(current.sessionId);
  },
  start: (rideId: string) => {
    if (starting?.rideId === rideId) return starting.promise;
    const request = ++generation;
    const cancelled = () => request !== generation;
    const assertCurrent = () => {
      if (cancelled()) throw new Error('El inicio del GPS se canceló.');
    };
    const operation = (async () => {
      const actor = (await sessionAdapter.getSession()).data.session?.user.id;
      assertCurrent();
      if (!actor) throw new Error('Inicia sesión para compartir el GPS.');
      await prepareTracking();
      assertCurrent();
      if (!native) return;
      const current = await native.status();
      assertCurrent();
      if (current.rideId === rideId && !current.error) return;
      if (current.rideId) await native.stop();
      assertCurrent();
      let deviceId = await AsyncStorage.getItem('@krow/tracking-device');
      assertCurrent();
      if (!deviceId) {
        deviceId = newId();
        await AsyncStorage.setItem('@krow/tracking-device', deviceId);
      }
      assertCurrent();
      const createSession = sessionCreation.then(async () => {
        assertCurrent();
        const currentActor = (await sessionAdapter.getSession()).data.session
          ?.user.id;
        assertCurrent();
        if (actor !== currentActor)
          throw new Error('La cuenta cambió. Abre el viaje de nuevo.');
        return pilotApi.session(rideId, deviceId);
      });
      sessionCreation = createSession.then(
        () => undefined,
        () => undefined,
      );
      const session = await createSession;
      const url = `${apiBaseUrl()}/v1/rides/${rideId}/tracking/locations`;
      try {
        const expiresAtMillis = Date.parse(session?.expiresAt);
        if (
          !session?.sessionId ||
          !session.uploadToken ||
          !Number.isFinite(expiresAtMillis) ||
          expiresAtMillis <= Date.now()
        )
          throw new Error(
            'La sesión GPS no es válida. Reintenta el seguimiento.',
          );
        const currentActor = (await sessionAdapter.getSession()).data.session
          ?.user.id;
        assertCurrent();
        if (actor !== currentActor)
          throw new Error('La cuenta cambió. Abre el viaje de nuevo.');
        await native.start(
          JSON.stringify({
            ...session,
            rideId,
            expiresAtMillis,
            url,
          }),
        );
        if (cancelled()) {
          // stop may have resolved while the native start was still pending.
          await native.stopSession(session.sessionId);
          assertCurrent();
        }
      } catch (error) {
        await revokeSession(url, session);
        throw error;
      }
    })();
    starting = { rideId, promise: operation };
    operation
      .finally(() => {
        if (starting?.promise === operation) starting = null;
      })
      .catch(() => undefined);
    return operation;
  },
};
