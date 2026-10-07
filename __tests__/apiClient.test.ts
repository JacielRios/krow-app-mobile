import { apiRequest } from '../src/core/api/apiClient';

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
