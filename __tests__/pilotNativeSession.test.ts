import { NativeModules, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { sessionAdapter } from '../src/core/auth/sessionAdapter';
import { pilotApi } from '../src/features/pilot/pilotApi';
import { apiRequest } from '../src/core/api/apiClient';

const mockNative = {
  start: jest.fn<Promise<boolean>, [string]>(async () => true),
  stop: jest.fn(async () => true),
  stopSession: jest.fn(async () => true),
  status: jest.fn<
    Promise<{
      rideId: string | null;
      sessionId: string | null;
      error: string | null;
    }>,
    []
  >(async () => ({ rideId: null, sessionId: null, error: null })),
};
const mockPush = {
  requestToken: jest.fn(async () => 'push-token'),
  setSessionActive: jest.fn(),
  setSessionActor: jest.fn(),
};
jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    request: jest.fn(),
    requestMultiple: jest.fn(),
    check: jest.fn(),
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    RESULTS: { GRANTED: 'granted' },
  },
}));
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: { getSession: jest.fn() },
}));
jest.mock('../src/core/api/apiClient', () => ({
  apiBaseUrl: () => 'https://api.test',
  apiRequest: jest.fn(),
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { session: jest.fn() },
}));
jest.mock('react-native-keychain', () => ({
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(async () => true),
}));

let tracking: typeof import('../src/features/pilot/nativeTracking').pilotTracking;
let push: typeof import('../src/features/pilot/pilotPush');
const session: Awaited<ReturnType<typeof sessionAdapter.getSession>> = {
  data: {
    session: {
      user: {
        id: 'driver',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-10-06T00:00:00Z',
      },
      access_token: 'driver-token',
      refresh_token: 'refresh',
      expires_in: 3600,
      token_type: 'bearer',
    },
  },
  error: null,
};
const upload = {
  sessionId: 'session',
  uploadToken: 'scoped-upload-token',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  return {
    promise: new Promise<T>(yes => {
      resolve = yes;
    }),
    resolve: (value: T) => resolve(value),
  };
}
beforeAll(() => {
  NativeModules.KrowPilotTracking = mockNative;
  NativeModules.KrowNotifications = mockPush;
  tracking = require('../src/features/pilot/nativeTracking').pilotTracking;
  push = require('../src/features/pilot/pilotPush');
});
beforeEach(async () => {
  jest.clearAllMocks();
  mockNative.status.mockResolvedValue({
    rideId: null,
    sessionId: null,
    error: null,
  });
  jest.mocked(sessionAdapter.getSession).mockResolvedValue(session);
  jest.mocked(pilotApi.session).mockResolvedValue(upload);
  jest.mocked(apiRequest).mockResolvedValue({ success: true });
  // RN declares a record of every permission even though it returns only requested keys.
  const grants = {
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
    'android.permission.ACCESS_COARSE_LOCATION': 'granted',
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>;
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue(grants);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted');
  jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
    username: 'device',
    password: 'device',
    service: 'device',
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
  global.fetch = jest.fn();
  await AsyncStorage.setItem('@krow/tracking-device', 'device');
});
afterEach(async () => {
  await tracking.stop();
  await push.synchronizePilotPush(false);
  jest.restoreAllMocks();
});
test('logout during session creation prevents native capture and revokes only that session', async () => {
  const pending = deferred<typeof upload>();
  jest.mocked(pilotApi.session).mockReturnValueOnce(pending.promise);
  const start = tracking.start('ride');
  const rejected = start.catch((error: unknown) => error);
  // Reach the pending HTTP creation after storage and permission awaits.
  while (!jest.mocked(pilotApi.session).mock.calls.length)
    await Promise.resolve();
  await tracking.stop();
  pending.resolve(upload);
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(mockNative.start).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledWith(
    'https://api.test/v1/rides/ride/tracking/locations/close',
    expect.objectContaining({
      body: JSON.stringify({
        sessionId: upload.sessionId,
        uploadToken: upload.uploadToken,
      }),
    }),
  );
});
test('repeated GPS activation shares one in-flight session request', async () => {
  const first = tracking.start('ride');
  const second = tracking.start('ride');
  expect(second).toBe(first);
  await first;
  expect(pilotApi.session).toHaveBeenCalledTimes(1);
  expect(mockNative.start).toHaveBeenCalledTimes(1);
});

test('leaving during GPS permissions cancels only the pending start', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>>();
  jest
    .spyOn(PermissionsAndroid, 'requestMultiple')
    .mockReturnValueOnce(pending.promise);
  const start = tracking.start('ride');
  const rejected = start.catch((error: unknown) => error);
  while (!jest.mocked(PermissionsAndroid.requestMultiple).mock.calls.length)
    await Promise.resolve();
  tracking.cancelStart('ride');
  pending.resolve({
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(mockNative.start).not.toHaveBeenCalled();
  expect(pilotApi.session).not.toHaveBeenCalled();
  expect(mockNative.stop).not.toHaveBeenCalled();
});

test('back then reopen serializes session creation so an old request cannot replace the new GPS session', async () => {
  const pending = deferred<typeof upload>();
  jest
    .mocked(pilotApi.session)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ...upload, sessionId: 'new-session' });
  const first = tracking.start('ride');
  const rejected = first.catch((error: unknown) => error);
  while (!jest.mocked(pilotApi.session).mock.calls.length)
    await Promise.resolve();
  tracking.cancelStart('ride');
  const reopened = tracking.start('ride');
  // The second activation can prepare permissions, but must not replace the
  // backend session while the old creation is still in flight.
  for (let step = 0; step < 20; step += 1) await Promise.resolve();
  expect(pilotApi.session).toHaveBeenCalledTimes(1);
  pending.resolve(upload);
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  await reopened;
  expect(pilotApi.session).toHaveBeenCalledTimes(2);
  expect(mockNative.start).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockNative.start.mock.calls[0][0]).sessionId).toBe(
    'new-session',
  );
  expect(fetch).toHaveBeenCalledWith(
    'https://api.test/v1/rides/ride/tracking/locations/close',
    expect.objectContaining({
      body: JSON.stringify({
        sessionId: 'session',
        uploadToken: upload.uploadToken,
      }),
    }),
  );
});

test('serialized creation keeps a successor bound to its own account and ride', async () => {
  const pending = deferred<typeof upload>();
  jest
    .mocked(pilotApi.session)
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ...upload, sessionId: 'second-session' });
  const first = tracking.start('ride-A');
  const rejected = first.catch((error: unknown) => error);
  while (!jest.mocked(pilotApi.session).mock.calls.length)
    await Promise.resolve();
  await tracking.stop();
  jest
    .mocked(sessionAdapter.getSession)
    .mockResolvedValue({
      ...session,
      data: {
        session: {
          ...session.data.session!,
          user: { ...session.data.session!.user, id: 'second-driver' },
        },
      },
    });
  const second = tracking.start('ride-B');
  for (let step = 0; step < 20; step += 1) await Promise.resolve();
  expect(pilotApi.session).toHaveBeenCalledTimes(1);
  pending.resolve(upload);
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  await second;
  expect(jest.mocked(pilotApi.session).mock.calls.map(call => call[0])).toEqual(
    ['ride-A', 'ride-B'],
  );
  expect(mockNative.start).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockNative.start.mock.calls[0][0])).toEqual(
    expect.objectContaining({ rideId: 'ride-B', sessionId: 'second-session' }),
  );
  expect(fetch).toHaveBeenCalledWith(
    'https://api.test/v1/rides/ride-A/tracking/locations/close',
    expect.any(Object),
  );
});

test('a denied precise location permission never invokes the native foreground service', async () => {
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValueOnce({
    'android.permission.ACCESS_FINE_LOCATION': 'denied',
  } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
  await expect(tracking.start('ride')).rejects.toThrow('ubicación precisa');
  expect(mockNative.start).not.toHaveBeenCalled();
  expect(pilotApi.session).not.toHaveBeenCalled();
});

test('an incomplete upload session cannot start native GPS', async () => {
  jest
    .mocked(pilotApi.session)
    .mockResolvedValueOnce({ ...upload, expiresAt: 'invalid' });
  await expect(tracking.start('ride')).rejects.toThrow(
    'sesión GPS no es válida',
  );
  expect(mockNative.start).not.toHaveBeenCalled();
});
test('stopping a completed trip cannot stop capture for a different trip', async () => {
  mockNative.status.mockResolvedValue({
    rideId: 'ride-B',
    sessionId: 'session-B',
    error: null,
  });
  await tracking.stop('ride-A');
  expect(mockNative.stop).not.toHaveBeenCalled();
  expect(mockNative.stopSession).not.toHaveBeenCalled();
});
test('stopping a trip targets its exact native session', async () => {
  mockNative.status.mockResolvedValue({
    rideId: 'ride-A',
    sessionId: 'session-A',
    error: null,
  });
  await tracking.stop('ride-A');
  expect(mockNative.stop).not.toHaveBeenCalled();
  expect(mockNative.stopSession).toHaveBeenCalledWith('session-A');
});
test('changing accounts while the permission prompt is pending never activates push', async () => {
  const pending = deferred<'granted'>();
  jest
    .spyOn(PermissionsAndroid, 'request')
    .mockReturnValueOnce(pending.promise);
  const registering = push.registerPilotPush();
  const rejected = registering.catch((error: unknown) => error);
  while (!jest.mocked(PermissionsAndroid.request).mock.calls.length)
    await Promise.resolve();
  await push.synchronizePilotPush(false);
  pending.resolve('granted');
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(apiRequest).not.toHaveBeenCalled();
  expect(mockPush.setSessionActive).not.toHaveBeenCalledWith(true);
});
test('cleanup of an old native start targets its session and cannot stop the next capture', async () => {
  const pending = deferred<boolean>();
  mockNative.start.mockReturnValueOnce(pending.promise);
  const first = tracking.start('ride-A');
  const rejected = first.catch((error: unknown) => error);
  while (!mockNative.start.mock.calls.length) await Promise.resolve();
  await tracking.stop();
  jest
    .mocked(pilotApi.session)
    .mockResolvedValueOnce({ ...upload, sessionId: 'session-B' });
  await tracking.start('ride-B');
  pending.resolve(true);
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(mockNative.stop).toHaveBeenCalledTimes(1);
  expect(mockNative.stopSession).toHaveBeenCalledWith('session');
});
test('an in-flight push registration is aborted at logout and stays bound to its actor', async () => {
  const pending = deferred<unknown>();
  jest.mocked(apiRequest).mockReturnValueOnce(pending.promise);
  const registering = push.registerPilotPush();
  const rejected = registering.catch((error: unknown) => error);
  while (!jest.mocked(apiRequest).mock.calls.length) await Promise.resolve();
  const request = jest.mocked(apiRequest).mock.calls[0][1];
  expect(request?.headers).toEqual({ Authorization: 'Bearer driver-token' });
  expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
    service: 'krow.pilot.device.driver',
  });
  await push.synchronizePilotPush(false);
  expect(request?.signal?.aborted).toBe(true);
  pending.resolve({ success: true });
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(mockPush.setSessionActive).not.toHaveBeenCalledWith(true);
});
test('a late registration from the previous account cannot replace the new account device', async () => {
  jest
    .mocked(Keychain.getGenericPassword)
    .mockImplementation(async options => ({
      username: 'device',
      password: options?.service?.includes('second')
        ? 'second-device'
        : 'first-device',
      service: options?.service ?? 'device',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    }));
  const pending = deferred<unknown>();
  jest.mocked(apiRequest).mockReturnValueOnce(pending.promise);
  const first = push.registerPilotPush();
  const rejected = first.catch((error: unknown) => error);
  while (!jest.mocked(apiRequest).mock.calls.length) await Promise.resolve();
  jest.mocked(sessionAdapter.getSession).mockResolvedValue({
    ...session,
    data: {
      session: {
        ...session.data.session!,
        user: { ...session.data.session!.user, id: 'second' },
        access_token: 'second-token',
      },
    },
  });
  await push.registerPilotPush();
  expect(jest.mocked(apiRequest).mock.calls.map(call => call[1]?.body)).toEqual(
    [
      JSON.stringify({ deviceId: 'first-device', token: 'push-token' }),
      JSON.stringify({ deviceId: 'second-device', token: 'push-token' }),
    ],
  );
  pending.resolve({ success: true });
  expect(await rejected).toEqual(
    expect.objectContaining({ message: expect.stringContaining('canceló') }),
  );
  expect(mockPush.setSessionActor).toHaveBeenCalledTimes(1);
  expect(mockPush.setSessionActor).toHaveBeenCalledWith('second');
});
