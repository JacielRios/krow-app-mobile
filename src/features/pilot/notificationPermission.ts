import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const promptKey = '@krow/notifications/startup-prompt-v1';
let startupAttempt: Promise<boolean> | undefined;

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'notDetermined'
  | 'unavailable';
interface PermissionNative {
  areNotificationsEnabled?: () => Promise<boolean>;
  getNotificationPermissionStatus?: () => Promise<NotificationPermissionState>;
  requestPermission?: () => Promise<boolean>;
}
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const bridge = NativeModules.KrowNotifications as
    | PermissionNative
    | undefined;
  if (Platform.OS === 'ios') {
    if (!bridge?.getNotificationPermissionStatus) return 'unavailable';
    const status = await bridge.getNotificationPermissionStatus();
    return ['granted', 'denied', 'notDetermined', 'unavailable'].includes(
      status,
    )
      ? status
      : 'unavailable';
  }
  if (Platform.OS !== 'android' || !bridge?.areNotificationsEnabled)
    return 'unavailable';
  if (
    Number(Platform.Version) >= 33 &&
    !(await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ))
  )
    return 'denied';
  return (await bridge.areNotificationsEnabled()) ? 'granted' : 'denied';
}
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } else if (Platform.OS === 'ios') {
    const bridge = NativeModules.KrowNotifications as
      | PermissionNative
      | undefined;
    if (!bridge?.requestPermission) return 'unavailable';
    await bridge.requestPermission();
  }
  return getNotificationPermissionState();
}

export async function notificationsAllowed() {
  if (Platform.OS !== 'android') return false;
  if (
    Number(Platform.Version) >= 33 &&
    !(await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ))
  )
    return false;
  const native = NativeModules.KrowNotifications as
    | { areNotificationsEnabled?: () => Promise<boolean> }
    | undefined;
  return native?.areNotificationsEnabled
    ? native.areNotificationsEnabled()
    : true;
}

// Device permission precedes login; no account, FCM token or API write is needed.
// Persist the attempt so denial/dismissal never produces a prompt at each launch.
export function requestStartupNotificationPermission(): Promise<boolean> {
  if (startupAttempt) return startupAttempt;
  startupAttempt = (async () => {
    if (Platform.OS !== 'android') return false;
    if (await notificationsAllowed()) return true;
    if (Number(Platform.Version) < 33) return false;
    if (await AsyncStorage.getItem(promptKey)) return false;
    await AsyncStorage.setItem(promptKey, 'attempted');
    try {
      return (
        (await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        )) === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      // A missing Activity is not a user decision. Permit another launch to try.
      await AsyncStorage.removeItem(promptKey);
      throw error;
    }
  })();
  return startupAttempt;
}
