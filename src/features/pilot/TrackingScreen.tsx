import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { rideApi } from '../ride/api/rideApi';
import { readActiveRideView } from '../ride/api/activeRideView';
import { RoutePreviewMap } from '../maps';
import { pilotApi } from './pilotApi';
import { pilotTracking } from './nativeTracking';
import { useTracking } from './useTracking';
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
import { statusText } from '../../shared/format';
export function TrackingScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mapHeight, setMapHeight] = useState(height);
  const [expanded, setExpanded] = useState(false);
  const params = useRoute().params as { rideId?: string } | undefined;
  const rideId = typeof params?.rideId === 'string' ? params.rideId : '';
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const cache = useQueryClient();
  const focused = useIsFocused();
  const screenActive = useRef(focused);
  const { theme } = useTheme();
  const q = useQuery({
    queryKey: ['active-detail', user?.userId, rideId],
    queryFn: () => rideApi.activeView(rideId),
    select: readActiveRideView,
    enabled: !!user && !!rideId,
    refetchInterval: focused ? 5000 : false,
  });
  const data = q.data;
  const driver = data?.role === 'conductor';
  const live =
    data?.ride?.status === 'in_progress' &&
    !!data?.ride &&
    (driver ||
      (data?.role === 'pasajero' &&
        ['confirmed', 'in_progress'].includes(data.myBooking?.status)));
  const tracking = useTracking(
    rideId,
    user?.userId,
    !!live && Config.KROW_TRACKING_ENABLED === 'true',
  );
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [feedback, setFeedback] = useState('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const attempted = useRef(false);
  useEffect(() => {
    screenActive.current = focused;
    if (focused && !actionPending.current) setBusy(false);
    return () => {
      screenActive.current = false;
      // Leaving the screen cancels a pending permission/session request, while
      // a running foreground service keeps sharing during the active trip.
      pilotTracking.cancelStart(rideId);
      attempted.current = false;
    };
  }, [focused, rideId]);
  useEffect(() => {
    if (
      driver &&
      live &&
      focused &&
      Config.KROW_TRACKING_ENABLED === 'true' &&
      !attempted.current
    ) {
      attempted.current = true;
      void pilotTracking
        .start(rideId)
        .then(() => {
          if (screenActive.current) setGpsError(null);
        })
        .catch(e => {
          if (screenActive.current)
            setGpsError(
              e instanceof Error ? e.message : 'No pudimos iniciar el GPS',
            );
        });
    }
  }, [driver, live, focused, rideId]);
  useEffect(() => {
    if (!driver || !focused || !live || Config.KROW_TRACKING_ENABLED !== 'true')
      return;
    let alive = true;
    const timer = setInterval(
      () =>
        void pilotTracking
          .status()
          .then(s => {
            if (alive && (s.rideId || s.error)) setGpsError(s.error);
          })
          .catch(() => {
            if (alive) setGpsError('No pudimos comprobar el estado del GPS');
          }),
      2000,
    );
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [driver, focused, live]);
  useEffect(() => {
    if (!data) return;
    if (
      ['completed', 'cancelled', 'interrupted'].includes(data.ride.status) ||
      (data.role === 'pasajero' &&
        [
          'completed',
          'rejected',
          'cancelled',
          'no_show',
          'interrupted',
        ].includes(data.myBooking.status))
    ) {
      if (driver)
        void pilotTracking.stop(rideId).catch(() => {
          if (screenActive.current)
            setGpsError('No pudimos detener el GPS en este dispositivo.');
        });
      if (focused) navigation.replace('RideHistory', { rideId });
    }
  }, [data, driver, navigation, rideId, focused]);
  const run = async (work: () => Promise<unknown>, success: string) => {
    if (actionPending.current || !screenActive.current) return;
    actionPending.current = true;
    setBusy(true);
    setFeedback('');
    try {
      await work();
      if (screenActive.current) {
        setFeedback(success);
        await Promise.all([q.refetch(), tracking.refresh()]);
      }
      await cache.invalidateQueries({ queryKey: ['activity'] });
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
  const finish = () =>
    Alert.alert(
      'Finalizar viaje',
      'Se cerrará el viaje y dejarás de compartir tu ubicación.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () =>
            void run(async () => {
              await rideApi.complete(rideId);
              await pilotTracking.stop(rideId);
              if (screenActive.current)
                navigation.replace('RideHistory', { rideId });
            }, 'Viaje finalizado'),
        },
      ],
    );
  if (!data)
    return (
      <ScreenContainer padded>
        <ScreenHeader
          title="Viaje en curso"
          onBack={() => navigation.goBack()}
        />
        {userLoading || q.isLoading ? (
          <Skeleton height={380} />
        ) : (
          <FeedbackState
            kind="error"
            title="No pudimos cargar el viaje"
            description={userError ?? q.error?.message}
            actionLabel="Reintentar"
            onAction={() => (user ? void q.refetch() : reload())}
          />
        )}
      </ScreenContainer>
    );
  const snapshot = tracking.snapshot;
  const position = snapshot?.position;
  const next = snapshot?.nextStop;
  const origin =
    data.ride.originLat != null && data.ride.originLng != null
      ? { lat: data.ride.originLat, lng: data.ride.originLng }
      : null;
  const destination =
    data.ride.destinationLat != null && data.ride.destinationLng != null
      ? { lat: data.ride.destinationLat, lng: data.ride.destinationLng }
      : null;
  const markers = (snapshot?.stops ?? []).map(s => ({
    id: s.stopId,
    point: { lat: s.lat, lng: s.lng },
    iconName: s.stopId === next?.stopId ? 'place' : 'circle',
    selected: s.stopId === next?.stopId,
    accessibilityLabel: s.address,
  }));
  if (snapshot?.myStop)
    markers.push({
      id: 'my-stop',
      point: snapshot.myStop,
      iconName: 'flag',
      selected: true,
      accessibilityLabel: 'Tu parada de descenso',
    });
  if (snapshot?.myPickup)
    markers.push({
      id: 'my-pickup',
      point: snapshot.myPickup,
      iconName: 'trip-origin',
      selected: snapshot.nextAction === 'pickup',
      accessibilityLabel: 'Tu parada de subida',
    });
  const proximity =
    next && position && tracking.state === 'live'
      ? Math.hypot(
          (next.lat - position.lat) * 111320,
          (next.lng - position.lng) *
            111320 *
            Math.cos((position.lat * Math.PI) / 180),
        )
      : null;
  const panelHeight = Math.min(
    mapHeight - insets.top - 88,
    Math.max(220, mapHeight * (expanded ? 0.68 : 0.38)),
  );
  return (
    <ScreenContainer safeTop={false} safeBottom={false}>
      <View
        style={{ flex: 1 }}
        onLayout={event => setMapHeight(event.nativeEvent.layout.height)}
      >
        <RoutePreviewMap
          trackingMode
          origin={origin}
          destination={destination}
          encodedPolyline={
            snapshot?.route?.polyline ?? data.ride.routePolyline ?? null
          }
          extraMarkers={markers}
          vehicle={
            position
              ? {
                  point: position,
                  stale: tracking.state !== 'live',
                  heading: position.heading,
                }
              : undefined
          }
          interactive
          height={mapHeight}
          style={{ ...StyleSheet.absoluteFillObject, borderRadius: 0 }}
          viewportInsets={{ top: insets.top + 68, bottom: panelHeight }}
        />
        <View style={{ position: 'absolute', top: insets.top + 12, left: 16 }}>
          <Button
            title="Volver"
            variant="outline"
            fullWidth={false}
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: theme.colors.surfaceRaised }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: panelHeight,
            backgroundColor: theme.colors.surfaceRaised,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
            paddingBottom: insets.bottom,
          }}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 4 }}>
            <Button
              title={
                expanded
                  ? 'Ver más mapa'
                  : driver
                  ? 'Ver pasajeros y acciones'
                  : 'Ver detalles del viaje'
              }
              variant="ghost"
              onPress={() => setExpanded(value => !value)}
              accessibilityState={{ expanded }}
            />
            <Text variant="title" accessibilityRole="header">
              {driver
                ? next
                  ? 'Próxima parada'
                  : 'Continúa al destino'
                : snapshot?.nextAction === 'pickup'
                ? 'Tu punto de encuentro'
                : 'Tu descenso'}
            </Text>
            <Text tone="secondary" numberOfLines={expanded ? undefined : 2}>
              {driver
                ? next?.address ?? data.ride.destinationAddress
                : snapshot?.nextAction === 'pickup'
                ? snapshot.myPickup?.address
                : snapshot?.myStop?.address ??
                  (data.role === 'pasajero'
                    ? data.myBooking.dropoffAddress
                    : '')}
            </Text>
            {driver && next && (
              <Text variant="caption" accessibilityLiveRegion="polite">
                {[
                  next.pickups?.length
                    ? `Suben: ${next.pickups.map(p => p.name).join(', ')}`
                    : '',
                  next.dropoffs?.length
                    ? `Bajan: ${next.dropoffs.map(p => p.name).join(', ')}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingVertical: 16,
              gap: 16,
            }}
          >
            <Text tone={tracking.state === 'live' ? 'secondary' : 'error'}>
              {tracking.state === 'live'
                ? 'GPS en vivo'
                : tracking.ageSeconds != null
                ? `Última ubicación hace ${tracking.ageSeconds} s${
                    tracking.state === 'stale' ? ' · Sin actualización' : ''
                  }`
                : 'Esperando una ubicación GPS precisa'}
            </Text>
            {!!position && (
              <Text variant="caption" tone="secondary">
                Precisión aproximada: {Math.round(position.accuracy)} m
              </Text>
            )}
            {tracking.state === 'live' && snapshot?.etaSeconds != null && (
              <Text variant="title">
                {snapshot.nextAction === 'pickup'
                  ? 'Llegada del conductor'
                  : 'Llegada a la parada'}{' '}
                aproximada: {Math.max(1, Math.ceil(snapshot.etaSeconds / 60))}{' '}
                min
              </Text>
            )}
            {!!snapshot?.route?.error && (
              <Text tone="error">{snapshot.route.error}</Text>
            )}
            {!!tracking.error && (
              <Text tone="error">
                No pudimos actualizar el GPS. Reintentando conexión…
              </Text>
            )}
            {driver && (
              <>
                <Card>
                  <View style={{ gap: 12 }}>
                    <Text variant="title">
                      {next ? 'Próxima parada' : 'Paradas atendidas'}
                    </Text>
                    <Text>
                      {next?.address ??
                        'Continúa hasta el destino y finaliza cuando corresponda.'}
                    </Text>
                    {proximity != null && proximity < 200 && (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={{ color: theme.colors.primary }}
                      >
                        Estás cerca de la parada · {Math.round(proximity)} m
                      </Text>
                    )}
                    {next?.pickups?.map(p => (
                      <View key={p.bookingId} style={{ gap: 8 }}>
                        <Text>Sube: {p.name}</Text>
                        <Button
                          title={`Confirmar subida de ${p.name}`}
                          loading={busy}
                          onPress={() =>
                            void run(
                              () =>
                                pilotApi.attend(rideId, p.bookingId, 'board'),
                              'Subida confirmada',
                            )
                          }
                        />
                        <Button
                          title="No se presentó"
                          variant="ghost"
                          disabled={busy}
                          onPress={() =>
                            Alert.alert(
                              'Confirmar ausencia',
                              `${p.name} no podrá seguir este viaje.`,
                              [
                                { text: 'Volver', style: 'cancel' },
                                {
                                  text: 'Confirmar ausencia',
                                  onPress: () =>
                                    void run(
                                      () =>
                                        pilotApi.attend(
                                          rideId,
                                          p.bookingId,
                                          'no-show',
                                        ),
                                      'Ausencia registrada',
                                    ),
                                },
                              ],
                            )
                          }
                        />
                        <Button
                          title="Abrir chat"
                          variant="outline"
                          onPress={() =>
                            navigation.navigate('Chat', {
                              bookingId: p.bookingId,
                            })
                          }
                        />
                      </View>
                    ))}
                    {next?.dropoffs?.map(p => (
                      <View key={p.bookingId} style={{ gap: 8 }}>
                        <Text>Baja: {p.name}</Text>
                        <Button
                          title={`Confirmar bajada de ${p.name}`}
                          loading={busy}
                          onPress={() =>
                            void run(
                              () =>
                                pilotApi.attend(rideId, p.bookingId, 'dropoff'),
                              'Bajada confirmada',
                            )
                          }
                        />
                        <Button
                          title="Ver cobro y reserva"
                          variant="outline"
                          onPress={() =>
                            navigation.navigate('RideHistory', { rideId })
                          }
                        />
                      </View>
                    ))}
                  </View>
                </Card>
                {!!gpsError && (
                  <Text tone="error" accessibilityLiveRegion="polite">
                    {gpsError}
                  </Text>
                )}
                <Button
                  title="Reanudar GPS"
                  variant="outline"
                  onPress={() =>
                    void pilotTracking
                      .start(rideId)
                      .then(() => {
                        if (screenActive.current) setGpsError(null);
                      })
                      .catch(e => {
                        if (screenActive.current)
                          setFeedback(
                            e instanceof Error
                              ? e.message
                              : 'No pudimos reanudar el GPS',
                          );
                      })
                  }
                />
                {(snapshot?.canComplete ??
                  (data.role === 'conductor' && data.canComplete)) && (
                  <Button
                    title="Finalizar viaje"
                    loading={busy}
                    onPress={finish}
                  />
                )}
              </>
            )}
            {data.role === 'pasajero' && (
              <Card>
                <View style={{ gap: 12 }}>
                  <Text variant="title">
                    {data.driver.fullName ?? 'Tu conductor'}
                  </Text>
                  <Text tone="secondary">
                    {[
                      data.driver.vehicleBrand,
                      data.driver.vehicleModel,
                      data.driver.vehicleColor,
                      data.driver.vehicleLicensePlate,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <Text>{statusText(data.myBooking.status)}</Text>
                  {snapshot?.myPickup && snapshot.nextAction === 'pickup' && (
                    <>
                      <Text variant="title">Tu punto de encuentro</Text>
                      <Text>{snapshot.myPickup.address}</Text>
                    </>
                  )}
                  <Text variant="title">Tu descenso</Text>
                  <Text>
                    {snapshot?.myStop?.address ??
                      data.myBooking.dropoffAddress ??
                      'Consulta tu parada con el conductor'}
                  </Text>
                  <Button
                    title="Hablar con el conductor"
                    variant="outline"
                    onPress={() =>
                      navigation.navigate('Chat', {
                        bookingId: data.myBooking.bookingId,
                      })
                    }
                  />
                </View>
              </Card>
            )}
            {!!feedback && (
              <Text accessibilityLiveRegion="polite">{feedback}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </ScreenContainer>
  );
}
