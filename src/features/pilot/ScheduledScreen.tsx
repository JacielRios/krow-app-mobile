import { Avatar } from '../../shared/components/ui/Avatar';
import { CashPaymentSummary } from '../ride/components/CashPaymentSummary';
import {
  TripFacts,
  TripNotice,
  TripOverview,
  TripRoute,
  TripStatus,
} from '../ride/components/TripPresentation';
import { useConfirmation } from '../../shared/components/ui-v2/useConfirmation';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import Config from 'react-native-config';
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { currentPassengerBooking, pilotApi } from './pilotApi';
import { pilotTracking } from './nativeTracking';
import { ReservationProgress } from './ReservationProgress';
import { rideApi } from '../ride/api/rideApi';
import { bookingApi } from '../ride/api/bookingApi';
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';
import {
  ScreenContainer,
  Text,
  Button,
  Card,
  Skeleton,
  FeedbackState,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { invitationLink } from '../ride-runtime/deepLinks';
export function ScheduledScreen() {
  const { confirm: confirmAction, dialog: confirmationDialog } =
    useConfirmation();

  const { theme } = useTheme();
  const { rideId } = useRoute().params as { rideId: string };
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const focused = useIsFocused();
  const screenActive = useRef(focused);
  const cache = useQueryClient();
  const q = useQuery({
    queryKey: ['ride-context', user?.userId, rideId],
    queryFn: () => pilotApi.history(rideId),
    enabled: !!user,
    refetchInterval: focused ? 5000 : false,
  });
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  useEffect(() => {
    screenActive.current = focused;
    if (focused && !actionPending.current) setBusy(false);
    return () => {
      screenActive.current = false;
    };
  }, [focused]);
  const [feedback, setFeedback] = useState('');
  const data = q.data;
  const driver = data?.role === 'driver';
  const passengerBooking =
    data?.role === 'passenger'
      ? currentPassengerBooking(data.bookings)
      : undefined;
  useEffect(() => {
    if (!focused) return;
    if (
      data?.role === 'passenger' &&
      passengerBooking &&
      ['completed', 'cancelled', 'rejected', 'no_show', 'interrupted'].includes(
        passengerBooking.status,
      )
    )
      nav.replace('RideHistory', { rideId });
    else if (data?.ride.status === 'in_progress')
      nav.replace(driver ? 'DriverActiveRide' : 'PassengerActiveRide', {
        rideId,
      });
    else if (
      data &&
      ['completed', 'cancelled', 'interrupted'].includes(data.ride.status)
    )
      nav.replace('RideHistory', { rideId });
  }, [data, driver, nav, rideId, passengerBooking, focused]);
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (actionPending.current || !screenActive.current) return;
    actionPending.current = true;
    setBusy(true);
    try {
      await work();
      if (screenActive.current) {
        setFeedback(success);
        await q.refetch();
      }
      await invalidateRideLists(cache);
    } catch (e) {
      if (screenActive.current)
        setFeedback(
          e instanceof Error ? e.message : 'No pudimos completar la acción',
        );
    } finally {
      actionPending.current = false;
      if (screenActive.current) setBusy(false);
    }
  };
  const bookings = [
    ...(driver
      ? data?.bookings ?? []
      : passengerBooking
      ? [passengerBooking]
      : []),
  ].sort((a, b) => (a.pickupOrder ?? 0) - (b.pickupOrder ?? 0));
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const groups = Array.from(
    bookings
      .reduce((result, booking) => {
        const key = `${booking.pickupOrder}:${booking.pickupAddress}`;
        const group = result.get(key) ?? {
          key,
          order: booking.pickupOrder,
          address: booking.pickupAddress,
          bookings: [],
        };
        group.bookings.push(booking);
        result.set(key, group);
        return result;
      }, new Map<string, { key: string; order: number; address: string; bookings: typeof bookings }>())
      .values(),
  );
  return (
    <ScreenContainer padded>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 20 }}
      >
        <ScreenHeader
          title={driver ? 'Tu viaje publicado' : 'Tu próximo viaje'}
          onBack={() => nav.goBack()}
        />
        {!data ? (
          userLoading || q.isLoading ? (
            <Skeleton height={240} />
          ) : (
            <FeedbackState
              kind="error"
              title="No pudimos recuperar el viaje"
              description={userError ?? q.error?.message}
              actionLabel="Reintentar"
              onAction={() => (user ? void q.refetch() : reload())}
            />
          )
        ) : (
          <>
            <TripOverview
              status={data.ride.status}
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
            {driver &&
              ['scheduled', 'full'].includes(data.ride.status) &&
              Date.parse(data.ride.departure_time) > Date.now() && (
                <Button
                  title="Invitar a este viaje"
                  variant="tonal"
                  onPress={() => {
                    void Promise.resolve()
                      .then(() =>
                        Share.share({
                          message: `Te invito a viajar en KROW. Elige tus paradas y solicita un lugar; la confirmación depende del conductor.\n${invitationLink(
                            rideId,
                            Config.KROW_LINK_ORIGIN,
                          )}`,
                        }),
                      )
                      .catch(() =>
                        setFeedback(
                          'No pudimos abrir las opciones para compartir.',
                        ),
                      );
                  }}
                  iconName="share"
                />
              )}
            {driver && (
              <TripFacts
                items={[
                  {
                    icon: 'people-outline',
                    label: 'Reservas confirmadas',
                    value: String(
                      bookings.filter(b => b.status === 'confirmed').length,
                    ),
                  },
                  {
                    icon: 'mark-email-unread',
                    label: 'Solicitudes pendientes',
                    value: String(pendingCount),
                  },
                ]}
              />
            )}
            <Text variant="title" accessibilityRole="header">
              {driver ? 'Pasajeros por parada' : 'Tu reserva'}
            </Text>
            {!bookings.length && (
              <TripNotice
                title="Aún sin reservas"
                description="Las solicitudes aparecerán aquí. Revísalas antes de comenzar el viaje."
              />
            )}
            {!driver && bookings[0] && (
              <ReservationProgress status={bookings[0].status} />
            )}
            {groups.map(group => (
              <View key={group.key} style={{ gap: 12 }}>
                {driver && (
                  <View style={{ gap: 4 }}>
                    <Text variant="title">Parada {group.order}</Text>
                    <Text tone="secondary">{group.address}</Text>
                  </View>
                )}
                {group.bookings.map(b => (
                  <Card
                    key={b.bookingId}
                    style={{
                      paddingVertical: 20,
                      borderBottomWidth: 0.5,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <View style={{ gap: 12 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <Avatar name={b.name} size="md" />
                        <Text style={{ flex: 1, fontWeight: '600' }}>
                          {driver ? b.name : 'Tu reserva'}
                        </Text>
                      </View>
                      <TripStatus status={b.status} />
                      <TripRoute
                        origin={b.pickupAddress}
                        destination={b.dropoffAddress}
                        originLabel="Subida"
                        destinationLabel="Bajada"
                        compact
                      />
                      <CashPaymentSummary
                        amountCents={b.amountCents}
                        role={driver ? 'driver' : 'passenger'}
                      />
                      {driver && b.status === 'pending' && (
                        <>
                          <Button
                            title="Aceptar solicitud"
                            loading={busy}
                            onPress={() =>
                              void run(
                                () =>
                                  bookingApi.updateStatus(
                                    b.bookingId,
                                    'confirmed',
                                  ),
                                'Solicitud aceptada',
                              )
                            }
                          />
                          <Button
                            title="Rechazar"
                            variant="text"
                            disabled={busy}
                            onPress={() =>
                              confirmAction({
                                title: 'Rechazar solicitud',
                                message:
                                  'El pasajero recibirá el nuevo estado.',
                                confirmLabel: 'Rechazar',
                                onConfirm: () =>
                                  void run(
                                    () =>
                                      bookingApi.updateStatus(
                                        b.bookingId,
                                        'rejected',
                                      ),
                                    'Solicitud rechazada',
                                  ),
                                destructive: true,
                              })
                            }
                          />
                        </>
                      )}
                      {['confirmed', 'in_progress'].includes(b.status) && (
                        <Button
                          title={
                            driver
                              ? 'Hablar con el pasajero'
                              : 'Hablar con el conductor'
                          }
                          variant="tonal"
                          onPress={() =>
                            nav.navigate('Chat', { bookingId: b.bookingId })
                          }
                          iconName="chat-bubble-outline"
                        />
                      )}
                      {!driver &&
                        ['pending', 'confirmed'].includes(b.status) && (
                          <Button
                            title="Cancelar reserva"
                            variant="ghost"
                            disabled={busy}
                            onPress={() =>
                              confirmAction({
                                title: 'Cancelar reserva',
                                message: 'Tu lugar dejará de estar reservado.',
                                confirmLabel: 'Cancelar reserva',
                                onConfirm: () =>
                                  void run(
                                    () =>
                                      bookingApi.updateStatus(
                                        b.bookingId,
                                        'cancelled',
                                      ),
                                    'Reserva cancelada',
                                  ),
                                destructive: true,
                              })
                            }
                          />
                        )}
                    </View>
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
        {!!q.error && !!data && (
          <Text tone="error">
            No se pudo actualizar. Se conserva la última información.
          </Text>
        )}
      </ScrollView>
      {driver && data && (
        <View
          style={{
            paddingTop: 12,
            gap: 4,
            borderTopWidth: 0.5,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" tone="secondary">
            {pendingCount > 0
              ? 'Acepta o rechaza las solicitudes antes de comenzar.'
              : 'Al comenzar podrás seguir la ruta y confirmar las subidas en cada parada.'}
          </Text>
          <Button
            title="Comenzar viaje"
            loading={busy}
            disabled={pendingCount > 0}
            onPress={() =>
              confirmAction({
                title: 'Comenzar viaje',
                message:
                  'Comparte tu ubicación durante el recorrido y confirma las subidas al llegar a cada parada.',
                confirmLabel: 'Comenzar',
                onConfirm: () =>
                  void run(async () => {
                    if (Config.KROW_TRACKING_ENABLED === 'true')
                      await pilotTracking.prepare();
                    if (!screenActive.current) return;
                    await rideApi.start(rideId);
                  }, 'Viaje iniciado'),
                destructive: false,
              })
            }
            iconName="play-arrow"
          />
          <Button
            title="Cancelar viaje"
            variant="text"
            labelStyle={{ color: theme.colors.status.error }}
            disabled={busy}
            onPress={() =>
              confirmAction({
                title: 'Cancelar viaje',
                message: 'Se cancelarán las reservas de este viaje.',
                confirmLabel: 'Cancelar viaje',
                onConfirm: () =>
                  void run(() => rideApi.cancel(rideId), 'Viaje cancelado'),
                destructive: true,
              })
            }
          />
        </View>
      )}
      {confirmationDialog}
    </ScreenContainer>
  );
}
