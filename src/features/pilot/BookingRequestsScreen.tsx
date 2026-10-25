import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import {
  ScreenContainer,
  Text,
  Button,
  FeedbackState,
  Skeleton,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { useBookingInbox } from './useBookingInbox';
import { BookingNoticeCard } from './BookingNoticeCard';
import { pilotApi, type BookingNotice } from './pilotApi';
import { acknowledgeBooking } from './bookingEvents';

export function BookingRequestsScreen() {
  const cache = useQueryClient();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { bookingId } = (useRoute().params ?? {}) as { bookingId?: string };
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const inbox = useBookingInbox(user?.userId);
  const detail = useQuery({
    queryKey: ['booking-notice', user?.userId, bookingId],
    queryFn: () => pilotApi.bookingNotice(bookingId!, user!.userId),
    enabled: !!bookingId && !!user,
    refetchInterval: 3000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });
  const query = bookingId ? detail : inbox;
  const items: BookingNotice[] = bookingId
    ? detail.data
      ? [detail.data]
      : []
    : inbox.data ?? [];
  const actor = user?.userId;
  const loading = userLoading || (!!user && query.isLoading);
  const needsResponse = items.filter(
    item => item.role === 'driver' && item.canRespond,
  );
  const updates = items.filter(
    item => !(item.role === 'driver' && item.canRespond),
  );
  const renderNotice = (item: BookingNotice) =>
    actor ? (
      <BookingNoticeCard
        key={item.bookingId}
        item={item}
        actorId={actor}
        fresh={!query.isError && !query.isFetching}
        onChanged={async () => {
          await Promise.allSettled([
            inbox.refetch(),
            ...(bookingId ? [detail.refetch()] : []),
          ]);
        }}
        onRead={
          item.role === 'passenger'
            ? async () => {
                cache.setQueryData(
                  ['booking-seen', actor],
                  await acknowledgeBooking(actor, item.eventKey),
                );
                nav.goBack();
              }
            : undefined
        }
        onOpen={async () => {
          if (item.role === 'passenger')
            cache.setQueryData(
              ['booking-seen', actor],
              await acknowledgeBooking(actor, item.eventKey),
            );
          nav.navigate('RideScheduled', { rideId: item.rideId });
        }}
      />
    ) : null;
  return (
    <ScreenContainer padded>
      <ScrollView
        contentContainerStyle={{ gap: 20, paddingVertical: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => {
              if (user) void query.refetch();
              else reload();
            }}
          />
        }
      >
        <ScreenHeader
          title="Solicitudes y respuestas"
          onBack={() => nav.goBack()}
        />
        <Text tone="secondary">
          Revisa quién quiere viajar contigo y el estado de tus reservas.
        </Text>
        {loading && <Skeleton height={240} />}
        {!!(query.error || userError) && (
          <FeedbackState
            kind="error"
            title="No pudimos verificar las solicitudes"
            description={userError ?? query.error?.message}
            actionLabel="Actualizar"
            onAction={() => {
              if (user) void query.refetch();
              else reload();
            }}
          />
        )}
        {!loading && !!user && !items.length && !query.error && !userError && (
          <FeedbackState
            title="Todo al día"
            description="Aquí aparecerán las nuevas solicitudes y las respuestas a tus reservas."
          />
        )}
        {!!needsResponse.length && (
          <View style={{ gap: 12 }}>
            <Text variant="title" accessibilityRole="header">
              Por responder · {needsResponse.length}
            </Text>
            {needsResponse.map(renderNotice)}
          </View>
        )}
        {!!updates.length && (
          <View style={{ gap: 12 }}>
            <Text variant="title" accessibilityRole="header">
              Respuestas y actividad
            </Text>
            {updates.map(renderNotice)}
          </View>
        )}
        {!!items.length && (
          <Text variant="caption" tone="secondary">
            Desliza para actualizar. Las solicitudes también están aquí si no
            recibiste un aviso.
          </Text>
        )}
        {bookingId && (
          <Button
            title="Todas las solicitudes"
            variant="outline"
            onPress={() => nav.setParams({ bookingId: undefined })}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
