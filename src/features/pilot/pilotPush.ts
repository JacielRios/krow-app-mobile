import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { apiRequest } from '../../core/api/apiClient';
import { newId } from './nativeTracking';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { notificationsAllowed } from './notificationPermission';
const native = NativeModules.KrowNotifications as
  | {
      requestToken: () => Promise<string>;
      setSessionActive: (active: boolean) => void;
      setSessionActor: (actorId: string) => void;
    }
  | undefined;
let generation = 0;
let registration: AbortController | null = null;
let registeredActor: string | undefined;
function invalidateRegistration(deactivate = true) {
  generation += 1;
  registration?.abort();
  registration = null;
  if (deactivate) {
    registeredActor = undefined;
    native?.setSessionActive(false);
  }
  return generation;
}
export async function registerPilotPush(interactive = true) {
  const request = invalidateRegistration(false);
  const assertCurrent = () => {
    if (request !== generation)
      throw new Error('La activación de avisos se canceló.');
  };
  const session = (await sessionAdapter.getSession()).data.session;
  const actor = session?.user.id;
  assertCurrent();
  if (!actor) {
    invalidateRegistration();
    throw new Error('Inicia sesión para recibir avisos');
  }
  if (registeredActor !== actor) native?.setSessionActive(false);
  if (!native || Platform.OS !== 'android')
    throw new Error(
      'Las notificaciones requieren una compilación Android configurada.',
    );
  if (
    !(interactive && Number(Platform.Version) >= 33
      ? (await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        )) === PermissionsAndroid.RESULTS.GRANTED
      : await notificationsAllowed())
  )
    throw new Error(
      'Permite las notificaciones para recibir avisos del viaje.',
    );
  assertCurrent();
  const token = await native.requestToken();
  assertCurrent();
  const saved = await Keychain.getGenericPassword({
    service: `krow.pilot.device.${actor}`,
  });
  assertCurrent();
  const deviceId = saved ? saved.password : newId();
  if (
    !saved &&
    !(await Keychain.setGenericPassword('device', deviceId, {
      service: `krow.pilot.device.${actor}`,
    }))
  )
    throw new Error(
      'No pudimos guardar las preferencias de avisos de forma segura.',
    );
  assertCurrent();
  const controller = new AbortController();
  registration = controller;
  try {
    await apiRequest('/devices', {
      method: 'POST',
      // Keep this request bound to the actor that initiated opt-in.
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ deviceId, token }),
      signal: controller.signal,
    });
  } finally {
    if (registration === controller) registration = null;
  }
  assertCurrent();
  if (
    !(await Keychain.setGenericPassword('push', 'enabled', {
      service: 'krow.pilot.push',
    }))
  )
    throw new Error(
      'No pudimos guardar las preferencias de avisos de forma segura.',
    );
  assertCurrent();
  if ((await sessionAdapter.getSession()).data.session?.user.id !== actor)
    throw new Error('La cuenta cambió. Activa los avisos de nuevo.');
  assertCurrent();
  native.setSessionActor(actor);
  native.setSessionActive(true);
  registeredActor = actor;
}
export async function synchronizePilotPush(active: boolean) {
  if (!active) {
    invalidateRegistration();
    return;
  }
  // OS permission is the consent. Register after login even on a fresh install;
  // returning from Android settings also recovers a newly granted permission.
  await registerPilotPush(false);
}
export async function unregisterPilotPush() {
  invalidateRegistration();
  const session = (await sessionAdapter.getSession()).data.session;
  if (!session) return;
  const saved = await Keychain.getGenericPassword({
    service: `krow.pilot.device.${session.user.id}`,
  });
  if (saved && session)
    await apiRequest('/devices/' + saved.password, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => undefined);
}
