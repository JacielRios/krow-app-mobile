import { sessionAdapter } from '../src/core/auth/sessionAdapter';

const mockExchange = jest.fn(async (_code: string) => ({
  data: { redirectType: null as string | null },
  error: null as Error | null,
}));
const mockVerify = jest.fn(
  async (_request: { token_hash: string; type: string }) => ({
    error: null as Error | null,
  }),
);
jest.mock('react-native-config', () => ({
  KROW_AUTH_REDIRECT_URL: 'https://krow.example/auth/callback',
}));
jest.mock('../src/core/auth/supabaseAuthClient', () => ({
  supabaseAuthClient: {
    auth: {
      exchangeCodeForSession: (code: string) => mockExchange(code),
      verifyOtp: (request: { token_hash: string; type: string }) =>
        mockVerify(request),
    },
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockExchange.mockResolvedValue({ data: { redirectType: null }, error: null });
  mockVerify.mockResolvedValue({ error: null });
});

test('opens password recovery after PKCE exchange even when the SDK emits SIGNED_IN', async () => {
  mockExchange.mockResolvedValue({
    data: { redirectType: 'PASSWORD_RECOVERY' },
    error: null,
  });
  expect(
    await sessionAdapter.acceptAuthLink(
      'https://krow.example/auth/callback?code=verified-code',
    ),
  ).toBe('recovery');
  expect(mockExchange).toHaveBeenCalledWith('verified-code');
});

test('does not trust a recovery flag in an ordinary sign-in URL', async () => {
  expect(
    await sessionAdapter.acceptAuthLink(
      'https://krow.example/auth/callback?code=sign-in-code&type=recovery',
    ),
  ).toBe('authenticated');
});

test('only exchanges codes for the configured HTTPS host and path', async () => {
  for (const url of [
    'https://other.example/auth/callback?code=code',
    'http://krow.example/auth/callback?code=code',
    'https://krow.example/other-path?code=code',
  ])
    expect(await sessionAdapter.acceptAuthLink(url)).toBe(false);
  expect(mockExchange).not.toHaveBeenCalled();
});

test('does not accept an expired recovery token', async () => {
  mockVerify.mockResolvedValue({ error: new Error('Expired link') });
  await expect(
    sessionAdapter.acceptAuthLink(
      'https://krow.example/auth/callback?token_hash=expired&type=recovery',
    ),
  ).rejects.toThrow('Expired link');
  expect(mockVerify).toHaveBeenCalledWith({
    token_hash: 'expired',
    type: 'recovery',
  });
});
