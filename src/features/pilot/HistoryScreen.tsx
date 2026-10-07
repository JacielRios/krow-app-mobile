import React, { useRef, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { currentPassengerBooking, pilotApi, type History } from './pilotApi';
import { ReservationProgress } from './ReservationProgress';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import {
  ScreenContainer,
  Text,
  Card,
  Button,
  Skeleton,
  FeedbackState,
  StatusBadge,
  Input,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { StarRating } from '../../shared/components/ui/StarRating';
import { money, rideDate, statusText } from '../../shared/format';
function BookingSummary({
  booking,
  driver,
  onChanged,
}: {
  booking: History['bookings'][number];
  driver: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    try {
      await work();
      setFeedback(success);
      await onChanged();
    } catch (e) {
      setFeedback(
        e instanceof Error ? e.message : 'No pudimos completar la acción',
      );
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  };
  return (
    <Card>
      <View style={{ gap: 12 }}>
        {driver && <Text variant="title">{booking.name}</Text>}
        <StatusBadge
          label={statusText(booking.status)}
          tone={booking.status === 'completed' ? 'success' : 'info'}
        />
        <Text tone="secondary">Subida: {booking.pickupAddress}</Text>
        <Text tone="secondary">Bajada: {booking.dropoffAddress}</Text>
        <Text variant="title">{money(booking.amountCents)}</Text>
        <Text>
          {booking.cashStatus === 'collected'
            ? 'Efectivo recibido'
            : booking.cashStatus === 'void'
            ? 'Cobro anulado'
            : 'Efectivo pendiente'}
        </Text>
        {driver &&
          ['in_progress', 'completed'].includes(booking.status) &&
          booking.cashStatus !== 'collected' && (
            <Button
              title="Confirmar efectivo recibido"
              loading={busy}
              onPress={() =>
                Alert.alert(
                  'Registrar efectivo',
                  `Confirma que recibiste ${money(booking.amountCents)}.`,
                  [
                    { text: 'Volver', style: 'cancel' },
                    {
                      text: 'Confirmar',
                      onPress: () =>
                        void run(
                          () => pilotApi.collect(booking.bookingId),
                          'Efectivo registrado',
                        ),
                    },
                  ],
                )
              }
            />
          )}
        {booking.status === 'completed' &&
          (booking.myReview ? (
            <Text>Tu calificación: {booking.myReview} de 5</Text>
          ) : (
            <>
              <Text>¿Cómo fue tu experiencia? · Opcional</Text>
              <StarRating value={stars} onChange={setStars} />
              <Input
                label="Comentario opcional"
                value={comment}
                onChangeText={setComment}
                maxLength={1000}
                multiline
              />
              <Button
                title="Enviar calificación"
                disabled={!stars}
                loading={busy}
                onPress={() =>
                  void run(
                    () => pilotApi.review(booking.bookingId, stars, comment),
                    'Gracias por compartir tu experiencia',
                  )
                }
              />
            </>
          ))}
        <Button
          title="Ver conversación"
          variant="ghost"
          onPress={() => nav.navigate('Chat', { bookingId: booking.bookingId })}
        />
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
      </View>
    </Card>
  );
}
export function HistoryScreen() {
  const { rideId } = useRoute().params as { rideId: string };
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ['ride-context', user?.userId, rideId],
    queryFn: () => pilotApi.history(rideId),
    enabled: !!user,
  });
  const data = q.data;
  const passengerBooking =
    data?.role === 'passenger'
      ? currentPassengerBooking(data.bookings)
      : undefined;
  const ownStatus = passengerBooking?.status;
  const headingStatus =
    ownStatus &&
    ['completed', 'cancelled', 'rejected', 'no_show', 'interrupted'].includes(
      ownStatus,
    )
      ? ownStatus
      : data?.ride.status;
  const changed = async () => {
    await q.refetch();
    await cache.invalidateQueries({ queryKey: ['activity'] });
  };
  return (
    <ScreenContainer padded>
      <ScrollView
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 16 }}
      >
        <ScreenHeader
          title={
            headingStatus ? statusText(headingStatus) : 'Detalle del viaje'
          }
          onBack={() => nav.goBack()}
        />
        {!data ? (
          userLoading || q.isLoading ? (
            <Skeleton height={240} />
          ) : (
            <FeedbackState
              kind="error"
              title="No pudimos recuperar el detalle"
              description={userError ?? q.error?.message}
              actionLabel="Reintentar"
              onAction={() => (user ? void q.refetch() : reload())}
            />
          )
        ) : (
          <>
            <Card>
              <View style={{ gap: 12 }}>
                <Text variant="title">
                  {data.ride.origin_address} → {data.ride.destination_address}
                </Text>
                <Text tone="secondary">
                  {rideDate(data.ride.departure_time)}
                </Text>
                <Text>
                  {data.bookings.filter(b => b.status === 'completed').length}{' '}
                  reservas completadas
                </Text>
              </View>
            </Card>
            {passengerBooking && (
              <ReservationProgress status={passengerBooking.status} />
            )}
            {data.bookings.map(b => (
              <BookingSummary
                key={b.bookingId}
                booking={b}
                driver={data.role === 'driver'}
                onChanged={changed}
              />
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
