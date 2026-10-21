import { PanelHandle } from '../../shared/components/ui-v2/PanelHandle';
import {
  TripFacts,
  TripNotice,
  TripRoute,
  TripStatus,
} from '../ride/components/TripPresentation';
import { placeLabel } from '../../shared/placeLabel';
import { useConfirmation } from '../../shared/components/ui-v2/useConfirmation';
import { ExpandablePanel } from '../../shared/components/ui-v2/ExpandablePanel';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';
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
  IconButton,
  ListRow,
  Skeleton,
  FeedbackState,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Avatar } from '../../shared/components/ui/Avatar';
export function TrackingScreen() {
  const { confirm: confirmAction, dialog: confirmationDialog } =
    useConfirmation();

  const { height, fontScale } = useWindowDimensions();
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
  const [showConnection, setShowConnection] = useState(false);
  useEffect(() => {
    if (gpsError) {
      setExpanded(true);
      setShowConnection(true);
    }
  }, [gpsError]);
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
      await invalidateRideLists(cache);
    } catch (e) {
      if (screenActive.current) {
        setExpanded(true);
        setFeedback(
          e instanceof Error ? e.message : 'No pudimos completar la acción',
        );
      }
    } finally {
      actionPending.current = false;
      if (screenActive.current) setBusy(false);
    }
  };
  const finish = () =>
    confirmAction({
      title: 'Finalizar viaje',
      message: 'Se cerrará el viaje y dejarás de compartir tu ubicación.',
      confirmLabel: 'Sí, finalizar',
      onConfirm: () =>
        void run(async () => {
          await rideApi.complete(rideId);
          await pilotTracking.stop(rideId);
          if (screenActive.current)
            navigation.replace('RideHistory', { rideId });
        }, 'Viaje finalizado'),
      destructive: false,
    });
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
  const canFinish =
    snapshot?.canComplete ?? (data.role === 'conductor' && data.canComplete);
  const targetAddress = driver
    ? next?.address ?? data.ride.destinationAddress
    : snapshot?.nextAction === 'pickup'
    ? snapshot.myPickup?.address
    : snapshot?.myStop?.address ??
      (data.role === 'pasajero' ? data.myBooking.dropoffAddress : '');
  const target = placeLabel(targetAddress, 'Destino del viaje');
  const panelHeight = Math.max(
    220,
    Math.min(
      mapHeight - insets.top - 72,
      expanded
        ? mapHeight * 0.76
        : Math.max(270, 240 * Math.min(fontScale, 1.6)),
    ),
  );
  const positionLabel =
    tracking.state !== 'live'
      ? tracking.ageSeconds != null
        ? 'Sin actualización · hace ' + tracking.ageSeconds + ' s'
        : 'Esperando ubicación'
      : position && position.accuracy > 50
      ? 'Ubicación aproximada'
      : 'GPS en vivo';
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
                  accuracy: position.accuracy,
                }
              : undefined
          }
          interactive
          height={mapHeight}
          style={{ ...StyleSheet.absoluteFillObject, borderRadius: 0 }}
          viewportInsets={{ top: insets.top + 56, bottom: panelHeight }}
        />
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
          <IconButton
            variant="plain"
            accessibilityLabel="Volver"
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: 24,
            }}
            onPress={() => navigation.goBack()}
            iconName="arrow-back"
            color={theme.colors.textPrimary}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            top: insets.top + 18,
            alignSelf: 'center',
          }}
        >
          <TripStatus status={data.ride.status} />
        </View>
        <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
          <IconButton
            variant="plain"
            accessibilityLabel="Reportar un problema"
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: 24,
            }}
            onPress={() => navigation.navigate('ReportIncident', { rideId })}
            iconName="outlined-flag"
            color={theme.colors.textPrimary}
          />
        </View>
        <ExpandablePanel
          height={panelHeight}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
          }}
        >
          <PanelHandle expanded={expanded} onChange={setExpanded} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 16,
              gap: expanded ? 16 : 0,
            }}
          >
            <View style={{ paddingBottom: 12, gap: 4 }}>
              <Text variant="caption" tone="secondary">
                {driver
                  ? next
                    ? 'Próxima parada · ' + next.order
                    : canFinish
                    ? 'Cierre del recorrido'
                    : 'En recorrido'
                  : snapshot?.nextAction === 'pickup'
                  ? 'Tu punto de encuentro'
                  : 'Tu descenso'}
              </Text>
              <Text variant="title" numberOfLines={expanded ? undefined : 2}>
                {target.title}
              </Text>
              {expanded && !!target.detail && (
                <Text variant="caption" tone="secondary">
                  {target.detail}
                </Text>
              )}
              {driver && next && (
                <Text
                  variant="caption"
                  tone="secondary"
                  numberOfLines={expanded ? undefined : 1}
                >
                  {[
                    next.pickups?.length
                      ? 'Suben: ' + next.pickups.map(p => p.name).join(', ')
                      : '',
                    next.dropoffs?.length
                      ? 'Bajan: ' + next.dropoffs.map(p => p.name).join(', ')
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginTop: 4,
                }}
              >
                {tracking.state === 'live' && snapshot?.etaSeconds != null && (
                  <Text style={{ fontWeight: '600' }}>
                    {Math.max(1, Math.ceil(snapshot.etaSeconds / 60))} min
                    aprox.
                  </Text>
                )}
                <Text
                  variant="caption"
                  tone={tracking.state === 'live' ? 'secondary' : 'error'}
                >
                  {positionLabel}
                </Text>
              </View>
            </View>
            {expanded && (
              <>
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
                        <Text variant="title">Movimientos de pasajeros</Text>
                        {!next && (
                          <TripNotice
                            title="Sin paradas pendientes"
                            description="Continúa al destino. La opción de finalizar aparecerá cuando el viaje lo permita."
                          />
                        )}
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
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <Avatar name={p.name} size="md" />
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ fontWeight: '600' }}>
                                  {p.name}
                                </Text>
                                <Text variant="caption" tone="secondary">
                                  Sube en esta parada
                                </Text>
                              </View>
                              <IconButton
                                variant="plain"
                                accessibilityLabel={`Abrir chat con ${p.name}`}
                                onPress={() =>
                                  navigation.navigate('Chat', {
                                    bookingId: p.bookingId,
                                  })
                                }
                                iconName="chat-bubble-outline"
                                color={theme.colors.primary}
                              />
                            </View>
                            <Button
                              title={`Confirmar subida de ${p.name}`}
                              loading={busy}
                              onPress={() =>
                                void run(
                                  () =>
                                    pilotApi.attend(
                                      rideId,
                                      p.bookingId,
                                      'board',
                                    ),
                                  'Subida confirmada',
                                )
                              }
                            />
                            <Button
                              title="No se presentó"
                              variant="text"
                              size="sm"
                              disabled={busy}
                              onPress={() =>
                                confirmAction({
                                  title: 'Confirmar ausencia',
                                  message: `${p.name} no podrá seguir este viaje.`,
                                  confirmLabel: 'Confirmar ausencia',
                                  onConfirm: () =>
                                    void run(
                                      () =>
                                        pilotApi.attend(
                                          rideId,
                                          p.bookingId,
                                          'no-show',
                                        ),
                                      'Ausencia registrada',
                                    ),
                                  destructive: true,
                                })
                              }
                            />
                          </View>
                        ))}
                        {next?.dropoffs?.map(p => (
                          <View key={p.bookingId} style={{ gap: 8 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <Avatar name={p.name} size="md" />
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ fontWeight: '600' }}>
                                  {p.name}
                                </Text>
                                <Text variant="caption" tone="secondary">
                                  Baja en esta parada
                                </Text>
                              </View>
                            </View>
                            <Button
                              title={`Confirmar bajada de ${p.name}`}
                              loading={busy}
                              onPress={() =>
                                void run(
                                  () =>
                                    pilotApi.attend(
                                      rideId,
                                      p.bookingId,
                                      'dropoff',
                                    ),
                                  'Bajada confirmada',
                                )
                              }
                            />
                            <Button
                              title="Ver cobro y reserva"
                              variant="text"
                              size="sm"
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
                      variant="ghost"
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
                      iconName="my-location"
                    />
                    <Button
                      title="Actualizar recorrido"
                      variant="ghost"
                      disabled={!snapshot || tracking.state !== 'live' || busy}
                      onPress={() =>
                        confirmAction({
                          title: 'Actualizar recorrido',
                          message:
                            'Se calculará desde tu ubicación actual, conservando las paradas pendientes. Los pasajeros verán el mismo recorrido.',
                          confirmLabel: 'Actualizar',
                          onConfirm: () =>
                            void run(
                              () =>
                                pilotApi.reroute(
                                  rideId,
                                  snapshot!.route.version,
                                ),
                              'Recorrido actualizado para todos los participantes',
                            ),
                          destructive: false,
                        })
                      }
                      iconName="refresh"
                    />
                  </>
                )}
                {data.role === 'pasajero' && (
                  <View style={{ gap: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <Avatar
                        name={data.driver.fullName ?? undefined}
                        size="md"
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontWeight: '600' }}>
                          {data.driver.fullName ?? 'Tu conductor'}
                        </Text>
                        <TripStatus status={data.myBooking.status} />
                      </View>
                    </View>
                    <TripFacts
                      items={[
                        {
                          icon: 'directions-car',
                          label: 'Tu vehículo',
                          value:
                            [
                              data.driver.vehicleBrand,
                              data.driver.vehicleModel,
                              data.driver.vehicleColor,
                              data.driver.vehicleLicensePlate,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Sin datos del vehículo',
                        },
                      ]}
                    />
                    <TripRoute
                      origin={snapshot?.myPickup?.address}
                      destination={
                        snapshot?.myStop?.address ??
                        data.myBooking.dropoffAddress
                      }
                      originLabel="Subida"
                      destinationLabel="Bajada"
                      expandable
                    />
                  </View>
                )}
                <ListRow
                  title="Estado de conexión"
                  subtitle={
                    showConnection
                      ? 'Ocultar detalles GPS'
                      : 'Ver precisión y actualización'
                  }
                  onPress={() => setShowConnection(value => !value)}
                />
                {showConnection && (
                  <View style={{ gap: 8 }}>
                    {!!position && (
                      <Text variant="caption" tone="secondary">
                        Precisión aproximada: {Math.round(position.accuracy)} m
                      </Text>
                    )}
                    <Text variant="caption" tone="secondary">
                      {tracking.ageSeconds != null
                        ? 'Última ubicación hace ' + tracking.ageSeconds + ' s'
                        : 'Aún no hay una ubicación disponible.'}
                    </Text>
                  </View>
                )}
                {!!feedback && (
                  <Text accessibilityLiveRegion="polite">{feedback}</Text>
                )}
              </>
            )}
          </ScrollView>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(12, insets.bottom),
              borderTopWidth: 0.5,
              borderColor: theme.colors.border,
            }}
          >
            {driver ? (
              canFinish ? (
                <Button
                  title="Finalizar viaje"
                  loading={busy}
                  onPress={finish}
                  iconName="flag"
                />
              ) : (
                <Button
                  title={expanded ? 'Ver más mapa' : 'Ver pasajeros y acciones'}
                  onPress={() => setExpanded(value => !value)}
                  variant="tonal"
                  iconName={expanded ? 'map' : 'people-outline'}
                  accessibilityState={{ expanded }}
                />
              )
            ) : (
              data.role === 'pasajero' && (
                <Button
                  title="Contactar al conductor"
                  onPress={() =>
                    navigation.navigate('Chat', {
                      bookingId: data.myBooking.bookingId,
                    })
                  }
                  iconName="chat-bubble-outline"
                />
              )
            )}
          </View>
        </ExpandablePanel>
      </View>
      {confirmationDialog}
    </ScreenContainer>
  );
}
