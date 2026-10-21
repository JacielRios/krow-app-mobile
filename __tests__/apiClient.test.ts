import { apiRequest } from '../src/core/api/apiClient';
import { sessionAdapter } from '../src/core/auth/sessionAdapter';

jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: {
    getSession: jest.fn(async () => ({
      data: { session: { access_token: 'test-token' } },
    })),
  },
}));
const originalFetch = global.fetch;
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
});
const pendingFetch = () =>
  (global.fetch as jest.Mock).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () =>
          reject(new Error('Aborted')),
        );
      }),
  );
test('HTTP 204 is a normal empty result without trying to parse JSON', async () => {
  const json = jest.fn(async () => {
    throw new Error('No body');
  });
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 204,
    json,
  });
  await expect(
    apiRequest('/rides/mine/active?context=driver'),
  ).resolves.toBeNull();
  expect(json).not.toHaveBeenCalled();
});

test('deadline applies even when a caller supplies a cancellation signal', async () => {
  pendingFetch();
  const request = apiRequest('/maps/test', {
    signal: new AbortController().signal,
  });
  const check = expect(request).rejects.toMatchObject({
    status: 408,
    body: { code: 'REQUEST_TIMEOUT' },
  });
  await jest.advanceTimersByTimeAsync(15_000);
  await check;
});
test('caller cancellation stays a cancellation rather than a timeout', async () => {
  pendingFetch();
  const controller = new AbortController();
  const request = apiRequest('/maps/test', { signal: controller.signal });
  const check = expect(request).rejects.toThrow('Aborted');
  await Promise.resolve();
  controller.abort();
  await check;
  expect(jest.getTimerCount()).toBe(0);
});
test('a cached read is bound to the expected actor and does not leak its internal option to fetch', async () => {
  const session = (id: string) =>
    ({
      data: { session: { access_token: 'test-token', user: { id } } },
      error: null,
    } as unknown as Awaited<ReturnType<typeof sessionAdapter.getSession>>);
  jest
    .mocked(sessionAdapter.getSession)
    .mockResolvedValueOnce(session('other'));
  await expect(
    apiRequest('/activity', { expectedActorId: 'driver' }),
  ).rejects.toMatchObject({ status: 401, body: { code: 'ACCOUNT_CHANGED' } });
  expect(global.fetch).not.toHaveBeenCalled();
  jest
    .mocked(sessionAdapter.getSession)
    .mockResolvedValueOnce(session('driver'));
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => [],
  });
  await apiRequest('/activity', {
    expectedActorId: 'driver',
    headers: { Authorization: 'Bearer other-token' },
  });
  expect((global.fetch as jest.Mock).mock.calls[0][1]).not.toHaveProperty(
    'expectedActorId',
  );
  expect(
    (global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization,
  ).toBe('Bearer test-token');
});

test('network failures are actionable and HTTP errors retain their code', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(
    new TypeError('Network request failed'),
  );
  await expect(apiRequest('/maps/test')).rejects.toMatchObject({
    status: 0,
    body: { code: 'NETWORK_UNAVAILABLE' },
  });
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 429,
    json: async () => ({ code: 'RATE_LIMIT', message: 'Intenta más tarde' }),
  });
  await expect(apiRequest('/maps/test')).rejects.toMatchObject({
    status: 429,
    body: { code: 'RATE_LIMIT' },
  });
  expect(jest.getTimerCount()).toBe(0);
});

test('malformed successful JSON is an API error, while valid null responses and 204 remain allowed', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Truncated JSON');
    },
  });
  await expect(apiRequest('/activity')).rejects.toMatchObject({
    status: 502,
    body: { code: 'INVALID_RESPONSE' },
  });
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => null,
  });
  await expect(apiRequest('/rides/active')).resolves.toBeNull();
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 204,
    json: async () => {
      throw new SyntaxError('Empty body');
    },
  });
  await expect(
    apiRequest('/devices/device', { method: 'DELETE' }),
  ).resolves.toBeNull();
});
