import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { versionedApiRequest } from '../../core/api/apiClient';
import { newCommandId } from './runtimeApi';

interface PushNative {
  requestToken(): Promise<string>;
  setSessionActive(active: boolean): void;
}
const native = NativeModules.KrowNotifications as PushNative | undefined;
export async function registerTripNotifications() {
  if (!native)
    throw new Error(
      'Las notificaciones de viaje no están disponibles en esta compilación',
    );
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED)
      throw new Error(
        'Activa las notificaciones para recibir avisos fuera de la aplicación',
      );
  }
  const token = await native.requestToken();
  const saved = await Keychain.getGenericPassword({
    service: 'krow.device.id',
  });
  const deviceId = saved ? saved.password : newCommandId();
  if (!saved)
    await Keychain.setGenericPassword('device', deviceId, {
      service: 'krow.device.id',
    });
  await versionedApiRequest('v2', '/devices', {
    method: 'POST',
    body: JSON.stringify({ deviceId, platform: Platform.OS, token }),
  });
  await Keychain.setGenericPassword('push', 'enabled', {
    service: 'krow.push.enabled',
  });
  native.setSessionActive(true);
}
export async function synchronizePushSession(active: boolean) {
  native?.setSessionActive(false);
  if (
    active &&
    (await Keychain.getGenericPassword({ service: 'krow.push.enabled' }))
  )
    await registerTripNotifications();
}
export async function unregisterTripNotifications() {
  native?.setSessionActive(false);
  const device = await Keychain.getGenericPassword({
    service: 'krow.device.id',
  });
  if (
    device &&
    (await Keychain.getGenericPassword({ service: 'krow.push.enabled' }))
  ) {
    // Local display is disabled even when connectivity prevents remote revocation.
    await versionedApiRequest('v2', `/devices/${device.password}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
}
