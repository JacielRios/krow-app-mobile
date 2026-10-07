import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { sessionAdapter } from '../src/core/auth/sessionAdapter';
import { useCurrentUserRole } from '../src/features/home/hooks/useCurrentUserRole';
import { userApi } from '../src/features/auth/api/userApi';

let mockAuthListener:
  | ((authenticated: boolean, actorId?: string) => void)
  | undefined;
const mockUnsubscribe = jest.fn();
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: {
    getSession: jest.fn(),
    onAuthStateChange: (
      callback: (authenticated: boolean, actorId?: string) => void,
    ) => {
      mockAuthListener = callback;
      return mockUnsubscribe;
    },
  },
}));
jest.mock('../src/features/auth/api/userApi', () => ({
  userApi: { me: jest.fn() },
}));
const user: User = {
  id: 'old-actor',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-10-01T00:00:00Z',
};
const session: Session = {
  user,
  access_token: 'synthetic-token',
  refresh_token: 'synthetic-refresh',
  token_type: 'bearer',
  expires_in: 3600,
};
function Probe() {
  const state = useCurrentUserRole();
  return (
    <Text>
      {state.user?.userId ??
        (state.loading ? 'loading' : state.error ?? 'no-session')}
    </Text>
  );
}
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthListener = undefined;
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  cache.setQueryData(['me', 'new-actor'], {
    userId: 'new-actor',
    fullName: 'New User',
    email: null,
    driverProfile: null,
    canPublishRides: false,
  });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache.clear();
});
async function mount() {
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <Probe />
      </QueryClientProvider>,
    );
  });
}

test('a delayed session bootstrap cannot restore the previous actor after an auth event', async () => {
  let finish!: (value: { data: { session: Session }; error: null }) => void;
  jest.mocked(sessionAdapter.getSession).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  await act(() => mockAuthListener?.(true, 'new-actor'));
  expect(tree.root.findByType(Text).props.children).toBe('new-actor');
  await act(async () => finish({ data: { session }, error: null }));
  expect(tree.root.findByType(Text).props.children).toBe('new-actor');
  expect(cache.getQueryData(['me', 'old-actor'])).toBeUndefined();
  expect(userApi.me).not.toHaveBeenCalled();
});

test('a failed local session read displays a recoverable error rather than an endless skeleton', async () => {
  jest
    .mocked(sessionAdapter.getSession)
    .mockRejectedValueOnce(new Error('Keychain unavailable'));
  await mount();
  expect(tree.root.findByType(Text).props.children).toContain(
    'No pudimos recuperar tu sesión',
  );
});

test('leaving while bootstrap is pending removes the auth listener and does not fetch a profile', async () => {
  let finish!: (value: { data: { session: Session }; error: null }) => void;
  jest.mocked(sessionAdapter.getSession).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  await act(() => tree.unmount());
  expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  await act(async () => finish({ data: { session }, error: null }));
  expect(userApi.me).not.toHaveBeenCalled();
});
