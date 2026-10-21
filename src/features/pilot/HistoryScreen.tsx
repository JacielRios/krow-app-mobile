import { useConfirmation } from '../../shared/components/ui-v2/useConfirmation';
import React, { useRef, useState } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';
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
  Input,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { StarRating } from '../../shared/components/ui/StarRating';
import { money } from '../../shared/format';
import { Avatar } from '../../shared/components/ui/Avatar';
import {
  TripFacts,
  TripNotice,
  TripOverview,
  TripRoute,
  TripStatus,
} from '../ride/components/TripPresentation';
import { useTheme } from '../../shared/theme/ThemeProvider';
function BookingSummary({
  booking,
  driver,
  onChanged,
}: {
  booking: History['bookings'][number];
  driver: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const { confirm: confirmAction, dialog: confirmationDialog } =
    useConfirmation();

  const { theme } = useTheme();
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
    <Card
      style={{
        paddingVertical: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={booking.name} size="md" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: '600' }}>
              {driver ? booking.name : 'Tu reserva'}
            </Text>
            <TripStatus status={booking.status} />
          </View>
        </View>
        <TripRoute
          origin={booking.pickupAddress}
          destination={booking.dropoffAddress}
          originLabel="Subida"
          destinationLabel="Bajada"
          expandable
        />
        <TripFacts
          items={[
            {
              icon: 'payments',
              label: 'Importe de la reserva',
              value: money(booking.amountCents),
            },
            {
              icon: 'receipt-long',
              label: 'Cobro',
              value:
                booking.cashStatus === 'collected'
                  ? 'Efectivo recibido'
                  : booking.cashStatus === 'void'
                  ? 'Anulado'
                  : 'Pendiente',
            },
          ]}
        />
        {driver &&
          ['in_progress', 'completed'].includes(booking.status) &&
          booking.cashStatus !== 'collected' && (
            <Button
              title="Confirmar efectivo recibido"
              loading={busy}
              onPress={() =>
                confirmAction({
                  title: 'Registrar efectivo',
                  message: `Confirma que recibiste ${money(
                    booking.amountCents,
                  )}.`,
                  confirmLabel: 'Confirmar',
                  onConfirm: () =>
                    void run(
                      () => pilotApi.collect(booking.bookingId),
                      'Efectivo registrado',
                    ),
                  destructive: false,
                })
              }
              iconName="payments"
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
                iconName="star-outline"
              />
            </>
          ))}
        <Button
          title="Ver conversación"
          variant="tonal"
          onPress={() => nav.navigate('Chat', { bookingId: booking.bookingId })}
          iconName="chat-bubble-outline"
        />
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
      </View>
      {confirmationDialog}
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
    await invalidateRideLists(cache);
  };
  const canFollow =
    data?.ride.status === 'in_progress' &&
    (data.role === 'driver' ||
      (!!ownStatus && ['confirmed', 'in_progress'].includes(ownStatus)));
  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 20 }}
        >
          <ScreenHeader
            title={
              headingStatus === 'cancelled'
                ? 'Viaje cancelado'
                : headingStatus === 'completed'
                ? 'Resumen del viaje'
                : 'Detalle del viaje'
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
              <TripOverview
                status={headingStatus ?? data.ride.status}
                origin={data.ride.origin_address}
                destination={data.ride.destination_address}
                departure={data.ride.departure_time}
                driver={data.ride.driver_name}
                vehicle={[
                  data.ride.vehicle_brand,
                  data.ride.vehicle_model,
                  data.ride.license_plate,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
              {canFollow && (
                <TripNotice
                  icon="navigation"
                  title="El viaje sigue en curso"
                  description="Aquí puedes revisar las reservas y el efectivo. Vuelve al mapa para continuar el recorrido."
                />
              )}
              {headingStatus === 'cancelled' && (
                <TripNotice
                  icon="event-busy"
                  title="Este viaje fue cancelado"
                  description="Consulta abajo el estado de cada reserva y su cobro."
                />
              )}
              {!!data.bookings.length && (
                <TripFacts
                  items={[
                    {
                      icon: 'people-outline',
                      label: 'Reservas',
                      value: String(data.bookings.length),
                    },
                    {
                      icon: 'payments',
                      label: 'Efectivo recibido',
                      value: money(
                        data.bookings
                          .filter(b => b.cashStatus === 'collected')
                          .reduce((sum, b) => sum + b.amountCents, 0),
                      ),
                    },
                  ]}
                />
              )}
              {passengerBooking &&
                ['pending', 'confirmed', 'in_progress'].includes(
                  passengerBooking.status,
                ) && <ReservationProgress status={passengerBooking.status} />}
              <View style={{ gap: 4 }}>
                <Text variant="title" accessibilityRole="header">
                  {data.role === 'driver'
                    ? 'Pasajeros y reservas'
                    : 'Tus reservas'}
                </Text>
                {!data.bookings.length ? (
                  <TripNotice
                    title={
                      canFollow ? 'Viaje sin pasajeros' : 'No hubo reservas'
                    }
                    description={
                      canFollow
                        ? 'Continúa al destino y finaliza el recorrido cuando corresponda.'
                        : 'No hay movimientos de pasajeros ni cobros que consultar.'
                    }
                  />
                ) : (
                  data.bookings.map(b => (
                    <BookingSummary
                      key={b.bookingId}
                      booking={b}
                      driver={data.role === 'driver'}
                      onChanged={changed}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
        {canFollow && data && (
          <View style={{ paddingVertical: 12 }}>
            <Button
              title="Volver al seguimiento"
              onPress={() =>
                nav.navigate(
                  data.role === 'driver'
                    ? 'DriverActiveRide'
                    : 'PassengerActiveRide',
                  { rideId },
                )
              }
              iconName="navigation"
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
