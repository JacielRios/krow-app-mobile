import * as Keychain from 'react-native-keychain';
import { ApiError } from '../src/core/api/apiClient';
import {
  clearReadOnlyActor,
  readWithCache,
} from '../src/core/offline/readOnlyCache';

jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: { getSession: jest.fn() },
}));
const stored = new Map<string, string>();
const value = { label: 'Última consulta' };
const valid = (data: unknown): data is typeof value =>
  !!data &&
  typeof data === 'object' &&
  'label' in data &&
  typeof data.label === 'string';
const networkError = () => new ApiError(0, { code: 'NETWORK_UNAVAILABLE' });
const failed = () => Promise.reject(networkError());
beforeEach(() => {
  jest.clearAllMocks();
  stored.clear();
  jest
    .mocked(Keychain.setGenericPassword)
    .mockImplementation(async (_name, password, options) => {
      stored.set(options!.service!, password);
      return {
        service: options!.service!,
        storage: 'Keystore' as Keychain.STORAGE_TYPE,
      };
    });
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async options => {
    const password = stored.get(options!.service!);
    return password
      ? {
          username: 'actor',
          password,
          service: options!.service!,
          storage: 'Keystore' as Keychain.STORAGE_TYPE,
        }
      : false;
  });
  jest
    .mocked(Keychain.resetGenericPassword)
    .mockImplementation(async options => {
      stored.delete(options!.service!);
      return true;
    });
});
afterEach(() => jest.restoreAllMocks());

test('persists a secure copy, recovers it after reload and preserves its original age', async () => {
  const first = await readWithCache(
    'actor',
    'profile',
    async () => value,
    valid,
  );
  expect(first.source).toBe('network');
  jest.spyOn(Date, 'now').mockReturnValue(first.savedAt + 1000);
  let restored!: typeof readWithCache;
  let ReloadedError!: typeof ApiError;
  const readSaved = jest
    .mocked(Keychain.getGenericPassword)
    .getMockImplementation()!;
  jest.isolateModules(() => {
    const secure = require('react-native-keychain');
    secure.getGenericPassword.mockImplementation(readSaved);
    ReloadedError = require('../src/core/api/apiClient').ApiError;
    restored = require('../src/core/offline/readOnlyCache').readWithCache;
  });
  const cached = await restored(
    'actor',
    'profile',
    () => Promise.reject(new ReloadedError(0, {})),
    valid,
  );
  expect(cached).toEqual({
    data: value,
    source: 'cache',
    savedAt: first.savedAt,
  });
  expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('does not read another account or another resource and refuses stale/corrupt data', async () => {
  const first = await readWithCache(
    'actor',
    'profile',
    async () => value,
    valid,
  );
  await expect(
    readWithCache('another', 'profile', failed, valid),
  ).rejects.toMatchObject({ status: 0 });
  await expect(
    readWithCache('actor', 'activity.driver.upcoming', failed, valid),
  ).rejects.toMatchObject({ status: 0 });
  const entry = [...stored.entries()][0];
  stored.set(entry[0], '{broken-json');
  await expect(
    readWithCache('actor', 'profile', failed, valid),
  ).rejects.toMatchObject({ status: 0 });
  stored.set(entry[0], entry[1]);
  jest.spyOn(Date, 'now').mockReturnValue(first.savedAt + 86400001);
  await expect(
    readWithCache('actor', 'profile', failed, valid),
  ).rejects.toMatchObject({ status: 0 });
});

test.each([401, 403, 404, 500])(
  'does not hide HTTP %i behind a cached result',
  async status => {
    await readWithCache('actor', 'profile', async () => value, valid);
    await expect(
      readWithCache(
        'actor',
        'profile',
        () => Promise.reject(new ApiError(status, {})),
        valid,
      ),
    ).rejects.toMatchObject({ status });
    if ([401, 403].includes(status)) expect(stored.size).toBe(0);
  },
);

test('logout prevents a late network response from recreating its account cache', async () => {
  let finish!: (data: typeof value) => void;
  const pending = readWithCache(
    'actor',
    'profile',
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
    valid,
  );
  await clearReadOnlyActor('actor');
  finish(value);
  await pending;
  expect(stored.size).toBe(0);
});

test('a failed secure write keeps the online response successful without a plaintext fallback', async () => {
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  expect(
    (await readWithCache('actor', 'profile', async () => value, valid)).source,
  ).toBe('network');
  expect(stored.size).toBe(0);
});
