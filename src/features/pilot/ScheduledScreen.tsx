import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
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
import {
  ScreenContainer,
  Text,
  Button,
  Card,
  Skeleton,
  StatusBadge,
  FeedbackState,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { money, rideDate, statusText } from '../../shared/format';
export function ScheduledScreen() {
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
      await cache.invalidateQueries({ queryKey: ['activity'] });
      await cache.invalidateQueries({ queryKey: ['active-ride'] });
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
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 16 }}
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
            <Card>
              <View style={{ gap: 12 }}>
                <StatusBadge label={statusText(data.ride.status)} tone="info" />
                <Text variant="title">
                  {data.ride.origin_address} → {data.ride.destination_address}
                </Text>
                <Text tone="secondary">
                  {rideDate(data.ride.departure_time)}
                </Text>
                <Text>
                  {data.ride.driver_name ?? 'Conductor'} ·{' '}
                  {[
                    data.ride.vehicle_brand,
                    data.ride.vehicle_model,
                    data.ride.license_plate,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              </View>
            </Card>
            <Text variant="title">
              {driver ? 'Pasajeros por parada' : 'Tu punto de encuentro'}
            </Text>
            {!bookings.length && (
              <FeedbackState
                title="Todavía no hay solicitudes"
                description="Las reservas se mostrarán aquí cuando alguien solicite viajar."
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
                  <Card key={b.bookingId}>
                    <View style={{ gap: 12 }}>
                      {driver && <Text variant="title">{b.name}</Text>}
                      <StatusBadge
                        label={statusText(b.status)}
                        tone={b.status === 'confirmed' ? 'success' : 'info'}
                      />
                      <Text tone="secondary">
                        Subida · Parada {b.pickupOrder}
                      </Text>
                      <Text>{b.pickupAddress ?? 'Parada de subida'}</Text>
                      <Text tone="secondary">
                        Bajada · Parada {b.dropoffOrder}
                      </Text>
                      <Text>{b.dropoffAddress ?? 'Parada de descenso'}</Text>
                      <Text variant="title">{money(b.amountCents)}</Text>
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
                            variant="outline"
                            disabled={busy}
                            onPress={() =>
                              Alert.alert(
                                'Rechazar solicitud',
                                'El pasajero recibirá el nuevo estado.',
                                [
                                  { text: 'Volver', style: 'cancel' },
                                  {
                                    text: 'Rechazar',
                                    style: 'destructive',
                                    onPress: () =>
                                      void run(
                                        () =>
                                          bookingApi.updateStatus(
                                            b.bookingId,
                                            'rejected',
                                          ),
                                        'Solicitud rechazada',
                                      ),
                                  },
                                ],
                              )
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
                          variant="outline"
                          onPress={() =>
                            nav.navigate('Chat', { bookingId: b.bookingId })
                          }
                        />
                      )}
                      {!driver &&
                        ['pending', 'confirmed'].includes(b.status) && (
                          <Button
                            title="Cancelar reserva"
                            variant="ghost"
                            disabled={busy}
                            onPress={() =>
                              Alert.alert(
                                'Cancelar reserva',
                                'Tu lugar dejará de estar reservado.',
                                [
                                  { text: 'Volver', style: 'cancel' },
                                  {
                                    text: 'Cancelar reserva',
                                    style: 'destructive',
                                    onPress: () =>
                                      void run(
                                        () =>
                                          bookingApi.updateStatus(
                                            b.bookingId,
                                            'cancelled',
                                          ),
                                        'Reserva cancelada',
                                      ),
                                  },
                                ],
                              )
                            }
                          />
                        )}
                    </View>
                  </Card>
                ))}
              </View>
            ))}
            {driver && (
              <>
                {pendingCount > 0 && (
                  <FeedbackState
                    title={`${pendingCount} ${
                      pendingCount === 1
                        ? 'solicitud pendiente'
                        : 'solicitudes pendientes'
                    }`}
                    description="Acepta o rechaza las solicitudes antes de comenzar. Las subidas se confirman al llegar a cada parada."
                  />
                )}
                <Button
                  title="Comenzar viaje"
                  loading={busy}
                  disabled={pendingCount > 0}
                  onPress={() =>
                    Alert.alert(
                      'Comenzar viaje',
                      'Comparte tu ubicación durante el recorrido y confirma las subidas al llegar a cada parada.',
                      [
                        { text: 'Volver', style: 'cancel' },
                        {
                          text: 'Comenzar',
                          onPress: () =>
                            void run(async () => {
                              if (Config.KROW_TRACKING_ENABLED === 'true')
                                await pilotTracking.prepare();
                              if (!screenActive.current) return;
                              await rideApi.start(rideId);
                            }, 'Viaje iniciado'),
                        },
                      ],
                    )
                  }
                />
                <Button
                  title="Cancelar viaje"
                  variant="destructive"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Cancelar viaje',
                      'Se cancelarán las reservas de este viaje.',
                      [
                        { text: 'Volver', style: 'cancel' },
                        {
                          text: 'Cancelar viaje',
                          style: 'destructive',
                          onPress: () =>
                            void run(
                              () => rideApi.cancel(rideId),
                              'Viaje cancelado',
                            ),
                        },
                      ],
                    )
                  }
                />
              </>
            )}
          </>
        )}
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
        {!!q.error && !!data && (
          <Text tone="error">
            No se pudo actualizar. Se conserva la última información.
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
