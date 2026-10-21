import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { IconButton, Input } from '../src/shared/components/ui-v2';
import { ChatScreen } from '../src/features/pilot/ChatScreen';
import { pilotApi } from '../src/features/pilot/pilotApi';
import { FlatList } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { bookingId: 'booking' } }),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/features/home/hooks/useCurrentUserRole', () => ({
  useCurrentUserRole: () => ({ user: { userId: 'passenger' } }),
}));
jest.mock('../src/features/pilot/nativeTracking', () => ({
  newId: () => 'synthetic-message-id',
}));
jest.mock('../src/features/pilot/pilotApi', () => ({
  pilotApi: { messages: jest.fn(), send: jest.fn() },
}));
let tree: Renderer.ReactTestRenderer;
let cache: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(pilotApi.messages)
    .mockResolvedValue({ messages: [], canWrite: true, nextCursor: null });
});
afterEach(async () => {
  await act(() => tree?.unmount());
  cache?.clear();
});
async function mount() {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  cache.setQueryData(['chat', 'passenger', 'booking'], {
    pages: [{ messages: [], canWrite: true, nextCursor: null }],
    pageParams: [undefined],
  });
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={cache}>
        <ThemeProvider>
          <ChatScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
  await act(() =>
    tree.root
      .findByType(Input)
      .props.onChangeText('Nos vemos en la biblioteca'),
  );
}
function sendButton() {
  return tree.root
    .findAllByType(IconButton)
    .find(node =>
      ['Enviar mensaje', 'Reintentar envío'].includes(
        node.props.accessibilityLabel,
      ),
    )!;
}

test('a double tap sends one message and a network retry reuses its delivery identifier', async () => {
  let rejectSend!: (error: Error) => void;
  jest.mocked(pilotApi.send).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSend = reject;
      }),
  );
  await mount();
  await act(() => {
    const press = sendButton().props.onPress;
    press();
    press();
  });
  expect(pilotApi.send).toHaveBeenCalledTimes(1);
  await act(async () => rejectSend(new Error('Network unavailable')));
  expect(sendButton().props.accessibilityLabel).toBe('Reintentar envío');
  jest.mocked(pilotApi.send).mockResolvedValue(undefined);
  await act(async () => sendButton().props.onPress());
  expect(pilotApi.send).toHaveBeenNthCalledWith(
    2,
    'booking',
    'synthetic-message-id',
    'Nos vemos en la biblioteca',
    'passenger',
  );
  expect(tree.root.findByType(Input).props.value).toBe('');
});

test('conversation uses upright chronological messages and preserves older-message pagination', async () => {
  await mount();
  const msg = (messageId: string, createdAt: string) => ({
    messageId,
    createdAt,
    clientId: messageId,
    senderId: 'passenger',
    body: messageId,
  });
  await act(async () => {
    cache.setQueryData(['chat', 'passenger', 'booking'], {
      pages: [
        {
          messages: [
            msg('new', '2026-10-20T12:00:00Z'),
            msg('old', '2026-10-20T11:00:00Z'),
          ],
          canWrite: true,
          nextCursor: 'before',
        },
      ],
      pageParams: [undefined],
    });
    await new Promise(resolve => setTimeout(resolve, 10));
  });
  const list = tree.root.findByType(FlatList);
  expect(list.props.inverted).toBeFalsy();
  expect(
    list.props.data.map((m: { messageId: string }) => m.messageId),
  ).toEqual(['old', 'new']);
  expect(list.props.maintainVisibleContentPosition).toEqual({
    minIndexForVisible: 0,
  });
  expect(list.props.ListHeaderComponent.props.title).toBe(
    'Cargar mensajes anteriores',
  );
});

test('a send finishing after leaving the conversation does not restart its polling', async () => {
  let complete!: (value: unknown) => void;
  jest.mocked(pilotApi.send).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        complete = resolve;
      }),
  );
  await mount();
  await act(() => sendButton().props.onPress());
  await act(() => tree.unmount());
  await act(async () => complete(undefined));
  expect(pilotApi.messages).not.toHaveBeenCalled();
});
