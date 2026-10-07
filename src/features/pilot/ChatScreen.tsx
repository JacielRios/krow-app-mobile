import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, FlatList, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { pilotApi } from './pilotApi';
import { newId } from './nativeTracking';
import {
  ScreenContainer,
  Text,
  Button,
  Input,
  Card,
  FeedbackState,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { useTheme } from '../../shared/theme/ThemeProvider';
export function ChatScreen() {
  const { bookingId } = useRoute().params as { bookingId: string };
  const nav = useNavigation();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const focused = useIsFocused();
  const { theme } = useTheme();
  const q = useInfiniteQuery({
    queryKey: ['chat', user?.userId, bookingId],
    enabled: !!user,
    queryFn: ({ pageParam }) => pilotApi.messages(bookingId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    refetchInterval: focused ? 5000 : false,
  });
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const sendPending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [pending, setPending] = useState<{
    clientId: string;
    body: string;
  } | null>(null);
  const [feedback, setFeedback] = useState('');
  const canWrite = q.data?.pages[0].canWrite ?? false;
  const messages = [
    ...new Map(
      (q.data?.pages.flatMap(p => p.messages) ?? []).map(m => [m.messageId, m]),
    ).values(),
  ];
  const send = async () => {
    if (sendPending.current || !canWrite || (!body.trim() && !pending)) return;
    sendPending.current = true;
    const draft = pending ?? { clientId: newId(), body: body.trim() };
    setPending(draft);
    setSending(true);
    try {
      await pilotApi.send(bookingId, draft.clientId, draft.body);
      if (!mounted.current) return;
      setBody('');
      setPending(null);
      setFeedback('Mensaje enviado');
      await q.refetch();
    } catch (e) {
      if (mounted.current)
        setFeedback(
          e instanceof Error
            ? e.message
            : 'No pudimos enviar. Puedes reintentar.',
        );
    } finally {
      sendPending.current = false;
      if (mounted.current) setSending(false);
    }
  };
  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: 16 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Conversación del viaje"
          onBack={() => nav.goBack()}
        />
        <FlatList
          inverted
          data={messages}
          keyExtractor={m => m.messageId}
          contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <FeedbackState
              title={
                userLoading || q.isLoading
                  ? 'Cargando mensajes…'
                  : 'Coordina tu encuentro'
              }
              description="Esta conversación es privada entre pasajero y conductor."
            />
          }
          renderItem={({ item: m }) => (
            <Card
              style={{
                alignSelf:
                  m.senderId === user?.userId ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                backgroundColor:
                  m.senderId === user?.userId
                    ? theme.colors.primarySoft
                    : theme.colors.surfaceRaised,
              }}
            >
              <Text>{m.body}</Text>
              <Text variant="caption" tone="secondary">
                {new Date(m.createdAt).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Card>
          )}
        />
        {!!(q.error || userError) && (
          <FeedbackState
            kind="error"
            title="No pudimos actualizar los mensajes"
            description={userError ?? q.error?.message}
            actionLabel="Reintentar"
            onAction={() => (user ? void q.refetch() : reload())}
          />
        )}
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
        {canWrite ? (
          <View style={{ paddingTop: 12 }}>
            <Input
              label="Mensaje"
              value={body}
              onChangeText={setBody}
              editable={!pending && !sending}
              multiline
              maxLength={2000}
            />
            <Button
              title={pending ? 'Reintentar envío' : 'Enviar mensaje'}
              onPress={() => void send()}
              disabled={!body.trim() && !pending}
              loading={sending}
            />
          </View>
        ) : q.data ? (
          <Text tone="secondary" style={{ paddingVertical: 16 }}>
            Esta conversación solo permite lectura. Podrás escribir cuando tu
            reserva esté confirmada.
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
