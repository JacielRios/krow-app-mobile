import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
  NativeModules: {},
  PermissionsAndroid: {
    check: jest.fn(),
    request: jest.fn(),
    PERMISSIONS: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    RESULTS: { GRANTED: 'granted' },
  },
}));

const load = () =>
  require('../src/features/pilot/notificationPermission') as typeof import('../src/features/pilot/notificationPermission');
beforeEach(async () => {
  jest.resetModules();
  // Preserve the same mocked device storage across simulated process restarts.
  jest.doMock('@react-native-async-storage/async-storage', () => AsyncStorage);
  jest.doMock('react-native', () => ({
    NativeModules,
    PermissionsAndroid,
    Platform,
  }));
  await AsyncStorage.clear();
  jest.clearAllMocks();
  Object.assign(Platform, { OS: 'android', Version: 33 });
  NativeModules.KrowNotifications = {
    areNotificationsEnabled: jest.fn(async () => true),
  };
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  jest.mocked(PermissionsAndroid.request).mockResolvedValue('granted');
});

test('startup requests once before login and concurrent callers share the prompt', async () => {
  const permission = load();
  const first = permission.requestStartupNotificationPermission();
  expect(permission.requestStartupNotificationPermission()).toBe(first);
  expect(await first).toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
});

test('denial remains respected after a simulated process restart', async () => {
  jest.mocked(PermissionsAndroid.request).mockResolvedValue('denied');
  expect(await load().requestStartupNotificationPermission()).toBe(false);
  jest.resetModules();
  expect(await load().requestStartupNotificationPermission()).toBe(false);
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
});

test('an existing permission needs no prompt; Android below 13 uses system settings', async () => {
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  expect(await load().requestStartupNotificationPermission()).toBe(true);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  jest.resetModules();
  Object.assign(Platform, { Version: 32 });
  NativeModules.KrowNotifications.areNotificationsEnabled.mockResolvedValue(
    false,
  );
  expect(await load().requestStartupNotificationPermission()).toBe(false);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
});

test('returning from settings rechecks permission without another automatic prompt', async () => {
  jest.mocked(PermissionsAndroid.request).mockResolvedValue('denied');
  await load().requestStartupNotificationPermission();
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  expect(await load().notificationsAllowed()).toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(1);
});

test('a native Activity failure is retryable on the next launch', async () => {
  jest
    .mocked(PermissionsAndroid.request)
    .mockRejectedValueOnce(new Error('No Activity'));
  await expect(load().requestStartupNotificationPermission()).rejects.toThrow(
    'No Activity',
  );
  jest.resetModules();
  expect(await load().requestStartupNotificationPermission()).toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledTimes(2);
});

test('iOS does not call Android permission APIs', async () => {
  Object.assign(Platform, { OS: 'ios' });
  expect(await load().requestStartupNotificationPermission()).toBe(false);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
});

test('the settings UI respects a blocked Android channel and an unavailable native bridge', async () => {
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  NativeModules.KrowNotifications.areNotificationsEnabled.mockResolvedValue(
    false,
  );
  expect(await load().getNotificationPermissionState()).toBe('denied');
  NativeModules.KrowNotifications = undefined;
  expect(await load().getNotificationPermissionState()).toBe('unavailable');
});

test('iOS status is read from the system and an explicit request never calls Android APIs', async () => {
  Object.assign(Platform, { OS: 'ios' });
  const getStatus = jest.fn(async () => 'notDetermined');
  const request = jest.fn(async () => {
    getStatus.mockResolvedValue('granted');
    return true;
  });
  NativeModules.KrowNotifications = {
    getNotificationPermissionStatus: getStatus,
    requestPermission: request,
  };
  const permission = load();
  expect(await permission.getNotificationPermissionState()).toBe(
    'notDetermined',
  );
  expect(await permission.requestNotificationPermission()).toBe('granted');
  expect(request).toHaveBeenCalledTimes(1);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
});
