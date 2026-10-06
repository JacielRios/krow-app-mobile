import { AmbientBackground, Button } from '../../shared/components/ui-v2';
import { depth, glass } from '../../shared/theme/materials';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Config from 'react-native-config';
import Mapbox from '@rnmapbox/maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRuntimeRide } from './useRuntimeRide';
import { runtimeApi, newCommandId } from './runtimeApi';
import { nativeNavigation, type NativeGuidance } from './nativeNavigation';
import type { RuntimeAction } from './protocol';
import * as Keychain from 'react-native-keychain';
import { registerTripNotifications } from './pushRegistration';

const labels = {
  scheduled: 'Viaje programado',
  in_progress: 'Viaje en curso',
  completed: 'Viaje finalizado',
  cancelled: 'Viaje cancelado',
  interrupted: 'Viaje interrumpido',
};
export function RuntimeRideScreen({
  route,
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'RuntimeRide'>) {
  const { rideId } = route.params;
  const model = useRuntimeRide(rideId),
    { snapshot } = model;
  const { theme } = useTheme(),
    insets = useSafeAreaInsets();
  const [preparing, setPreparing] = useState(false),
    [offlineVersion, setOfflineVersion] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now()),
    [mapReady, setMapReady] = useState(false);
  const [guidance, setGuidance] = useState<NativeGuidance | null>(null);
  const [restoredSession, setRestoredSession] = useState<string | undefined>();
  const starting = useRef(false);
  const [startingNavigation, setStartingNavigation] = useState(false);
  useEffect(
    () =>
      nativeNavigation.onGuidance(update => {
        if (update.rideId !== rideId) return;
        setGuidance(previous => ({ ...previous, ...update }));
      }),
    [rideId],
  );
  useEffect(() => {
    let live = true;
    setOfflineVersion(null);
    setRestoredSession(undefined);
    setGuidance(null);
    void nativeNavigation
      .restore(rideId)
      .then(result => {
        if (!live) return;
        if (result?.ready) setOfflineVersion(result.routeVersion);
        setRestoredSession(result?.sessionId);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [rideId]);
  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    if (Config.KROW_MAPBOX_PUBLIC_TOKEN)
      void Mapbox.setAccessToken(Config.KROW_MAPBOX_PUBLIC_TOKEN).then(() =>
        setMapReady(true),
      );
    return () => clearInterval(interval);
  }, []);
  const foreground = theme.colors.textPrimary;
  const button = (title: string, action: () => void, disabled = false) => (
    <Button title={title} onPress={action} disabled={disabled} style={{ marginVertical: 4 }} />
  );
  const prepare = async () => {
    if (!snapshot) return;
    setPreparing(true);
    try {
      if (!snapshot.route)
        await runtimeApi.prepareRoute(rideId, snapshot.version);
      const latest = await runtimeApi.snapshot(rideId);
      const result = await nativeNavigation.prepare(latest);
      if (!result.ready || result.routeVersion !== latest.routeVersion)
        throw new Error('La descarga offline todavía no está completa');
      setOfflineVersion(result.routeVersion);
      await model.refresh();
    } catch (cause) {
      Alert.alert(
        'Preparación pendiente',
        cause instanceof Error
          ? cause.message
          : 'No se pudo preparar la navegación',
      );
    } finally {
      setPreparing(false);
    }
  };
  const start = async () => {
    if (!snapshot || starting.current) return;
    starting.current = true;
    setStartingNavigation(true);
    let started = false;
    let openedSession: string | undefined;
    try {
      const saved = await Keychain.getGenericPassword({
        service: 'krow.device.id',
      });
      const deviceId = saved ? saved.password : newCommandId();
      if (!saved)
        await Keychain.setGenericPassword('device', deviceId, {
          service: 'krow.device.id',
        });
      let sessionId =
        snapshot.state === 'in_progress' ? restoredSession : undefined;
      if (!sessionId) {
        sessionId = (await runtimeApi.session(rideId, deviceId)).sessionId;
        openedSession = sessionId;
      }
      await nativeNavigation.start(rideId, sessionId);
      started = true;
      if (snapshot?.state === 'scheduled') {
        await runtimeApi.command(rideId, {
          commandId: newCommandId(),
          expectedVersion: snapshot.version,
          action: 'start',
        });
        await model.refresh();
      }
      setRestoredSession(sessionId);
      await nativeNavigation
        .synchronizeTransport(rideId)
        .catch(() => undefined);
    } catch (cause) {
      if (started) await nativeNavigation.stop().catch(() => undefined);
      if (openedSession)
        await runtimeApi
          .closeSession(rideId, openedSession)
          .catch(() => undefined);
      setOfflineVersion(null);
      Alert.alert(
        'No se pudo iniciar',
        cause instanceof Error
          ? cause.message
          : 'Revisa los permisos y la conexión',
      );
    } finally {
      starting.current = false;
      setStartingNavigation(false);
    }
  };
  const safety = () =>
    Alert.alert(
      'Ayuda de seguridad',
      'Si necesitas asistencia inmediata, puedes llamar al 911.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Llamar al 911',
          onPress: () => {
            void Linking.openURL('tel:911');
          },
        },
        {
          text: 'Avisar a KROW',
          onPress: () => {
            void runtimeApi
              .incident(rideId, newCommandId())
              .then(result =>
                Alert.alert(
                  'Solicitud enviada',
                  result.humanAcknowledged
                    ? 'Un agente está atendiendo tu solicitud.'
                    : 'Pendiente de que un agente confirme la atención.',
                ),
              )
              .catch(() =>
                Alert.alert(
                  'No se pudo enviar',
                  'La solicitud no está confirmada. Si necesitas ayuda inmediata, llama al 911.',
                ),
              );
          },
        },
      ],
    );
  const dispatch = (
    action: RuntimeAction,
    bookingId?: string,
    stopId?: string,
  ) => {
    void model.command(action, { bookingId, stopId });
  };
  const vehiclePosition =
    snapshot?.role === 'driver' && guidance?.position
      ? guidance.position
      : snapshot?.position;
  const age = vehiclePosition
    ? Math.max(
        0,
        Math.floor((clock - Date.parse(vehiclePosition.capturedAt)) / 1000),
      )
    : null;
  const fresh = age !== null && age < 30;
  const moving = (vehiclePosition?.speedMps ?? 0) > 0.5 && fresh;
  const next = snapshot?.stops.find(s => s.stopId === snapshot.nextStopId);
  const terminal =
    snapshot &&
    ['completed', 'cancelled', 'interrupted'].includes(snapshot.state);
  const disabled =
    model.busy ||
    model.pending.some(item => item.state === 'conflict') ||
    moving;
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <AmbientBackground />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Text style={{ color: foreground }}>Volver</Text>
        </TouchableOpacity>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: foreground }]}
        >
          {snapshot ? labels[snapshot.state] : 'Recuperando viaje'}
        </Text>
      </View>
      {!snapshot ? (
        <View style={styles.content}>
          <ActivityIndicator />
          <Text style={{ color: foreground }}>
            {model.error ?? 'Conectando con KROW…'}
          </Text>
          {button('Reintentar', () => {
            void model.refresh();
          })}
        </View>
      ) : (
        <>
          {mapReady && snapshot.route && !terminal && (
            <Mapbox.MapView
              style={styles.map}
              styleURL={Mapbox.StyleURL.Street}
            >
              <Mapbox.Camera
                centerCoordinate={
                  snapshot.role === 'driver' && vehiclePosition
                    ? [vehiclePosition.lng, vehiclePosition.lat]
                    : undefined
                }
                defaultSettings={{
                  centerCoordinate: snapshot.route.geometry.coordinates[0],
                  zoomLevel: 13,
                }}
              />
              <Mapbox.ShapeSource
                id="active-route"
                shape={
                  snapshot.role === 'driver' && guidance?.geometry
                    ? guidance.geometry
                    : snapshot.route.geometry
                }
              >
                <Mapbox.LineLayer
                  id="active-route-line"
                  style={{ lineColor: theme.colors.primary, lineWidth: 5 }}
                />
              </Mapbox.ShapeSource>
              {vehiclePosition && (
                <Mapbox.PointAnnotation
                  id="vehicle"
                  coordinate={[vehiclePosition.lng, vehiclePosition.lat]}
                >
                  <View
                    style={[styles.vehicle, { backgroundColor: theme.colors.primary, opacity: fresh ? 1 : 0.4 }]}
                  />
                </Mapbox.PointAnnotation>
              )}
            </Mapbox.MapView>
          )}
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            {!terminal && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: foreground }}
              >
                {fresh && snapshot.role === 'driver' && guidance?.position
                  ? 'GPS del dispositivo · navegación local'
                  : fresh
                  ? model.connected
                    ? 'Ubicación actualizada'
                    : 'Actualizaciones por conexión de respaldo'
                  : age === null
                  ? 'Ubicación todavía no disponible'
                  : `Última ubicación hace ${age} s`}
              </Text>
            )}
            {model.error && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: foreground }}
              >
                {model.error}. Conservamos la última información.
              </Text>
            )}
            {snapshot.etaSeconds !== null &&
              fresh &&
              clock - Date.parse(snapshot.generatedAt) < 30000 && (
                <Text style={[styles.title, { color: foreground }]}>
                  {Math.ceil(snapshot.etaSeconds / 60)} min ·{' '}
                  {((snapshot.remainingMeters ?? 0) / 1000).toFixed(1)} km
                </Text>
              )}
            {snapshot.role === 'driver' && guidance && !terminal && (
              <View style={[styles.card, glass(theme), depth(theme, 2)]}>
                <Text style={{ color: foreground }}>
                  {guidance.instruction ||
                    'Navegación local hacia la próxima parada'}
                </Text>
                <Text style={{ color: foreground }}>
                  Ruta local provisional · KROW conserva las paradas del viaje
                </Text>
                {guidance.error && (
                  <Text style={{ color: foreground }}>{guidance.error}</Text>
                )}
              </View>
            )}
            {next && !terminal && (
              <View
                style={[
                  styles.card, glass(theme), depth(theme, 2),
                  { backgroundColor: theme.colors.surfaceRaised },
                ]}
              >
                <Text style={[styles.title, { color: foreground }]}>
                  Próxima parada
                </Text>
                <Text style={{ color: foreground }}>{next.address}</Text>
                {snapshot.role === 'driver' && (
                  <Text style={{ color: foreground }}>
                    Suben {next.pickups} · Bajan {next.dropoffs}
                  </Text>
                )}
              </View>
            )}
            {model.pending.map(item => (
              <View key={item.command.commandId} style={[styles.card, glass(theme), depth(theme, 2)]}>
                <Text style={{ color: foreground }}>
                  {item.state === 'conflict'
                    ? 'El viaje cambió. Esta acción necesita revisión.'
                    : 'Acción guardada en este dispositivo. Pendiente de confirmación.'}
                </Text>
                {item.state === 'conflict' &&
                  button('Descartar acción y revisar viaje', () => {
                    void model.dismissConflict(item.command.commandId);
                  })}
              </View>
            ))}
            {snapshot.role === 'driver' && !terminal && (
              <>
                {(snapshot.state === 'scheduled' ||
                  snapshot.state === 'in_progress') && (
                  <>
                    {button(
                      preparing
                        ? 'Descargando navegación…'
                        : 'Preparar navegación sin conexión',
                      () => {
                        void prepare();
                      },
                      preparing,
                    )}
                    <Text style={{ color: foreground }}>
                      {offlineVersion === snapshot.routeVersion
                        ? 'Recorrido descargado y verificado'
                        : 'La navegación offline necesita preparación'}
                    </Text>
                    {button(
                      snapshot.state === 'scheduled'
                        ? 'Iniciar viaje'
                        : 'Reanudar navegación',
                      () => {
                        void start();
                      },
                      preparing ||
                        startingNavigation ||
                        offlineVersion !== snapshot.routeVersion ||
                        disabled,
                    )}
                    {snapshot.bookings
                      .filter(b => b.status === 'pending')
                      .map(b => (
                        <View key={b.bookingId} style={[styles.card, glass(theme), depth(theme, 2)]}>
                          <Text style={{ color: foreground }}>
                            Solicitud · {b.seats} asiento(s)
                          </Text>
                          {button(
                            'Aceptar',
                            () => dispatch('accept_booking', b.bookingId),
                            disabled,
                          )}
                          {button(
                            'Rechazar',
                            () => dispatch('reject_booking', b.bookingId),
                            disabled,
                          )}
                        </View>
                      ))}
                  </>
                )}
                {snapshot.state === 'in_progress' && next && (
                  <>
                    {moving && (
                      <Text style={{ color: foreground }}>
                        Detén el vehículo para confirmar pasajeros.
                      </Text>
                    )}
                    {next.state === 'pending' ||
                    next.state === 'approaching' ? (
                      button(
                        'Confirmar llegada',
                        () => dispatch('arrive', undefined, next.stopId),
                        disabled,
                      )
                    ) : (
                      <>
                        {snapshot.bookings
                          .filter(
                            b =>
                              b.pickupStopId === next.stopId &&
                              b.status === 'confirmed',
                          )
                          .map(b => (
                            <View key={b.bookingId}>
                              {button(
                                `Confirmar subida · ${b.seats} asiento(s)`,
                                () => dispatch('board', b.bookingId),
                                disabled,
                              )}
                              {button(
                                'Registrar ausencia',
                                () => {
                                  void model.command('no_show', {
                                    bookingId: b.bookingId,
                                    reason:
                                      'Conductor confirma ausencia en la parada',
                                  });
                                },
                                disabled,
                              )}
                            </View>
                          ))}
                        {snapshot.bookings
                          .filter(
                            b =>
                              b.dropoffStopId === next.stopId &&
                              b.status === 'in_progress',
                          )
                          .map(b => (
                            <View key={b.bookingId}>
                              {button(
                                `Confirmar descenso · ${b.seats} asiento(s)`,
                                () => dispatch('dropoff', b.bookingId),
                                disabled,
                              )}
                            </View>
                          ))}
                        {button(
                          'Salir de la parada',
                          () => dispatch('depart', undefined, next.stopId),
                          disabled,
                        )}
                      </>
                    )}
                  </>
                )}
                {snapshot.state === 'in_progress' &&
                  snapshot.bookings.every(
                    b => !['confirmed', 'in_progress'].includes(b.status),
                  ) &&
                  button(
                    'Finalizar viaje',
                    () => dispatch('complete'),
                    disabled || model.pending.length > 0,
                  )}
              </>
            )}
            {snapshot.role === 'passenger' &&
              snapshot.bookings.map(b => (
                <View key={b.bookingId} style={[styles.card, glass(theme), depth(theme, 2)]}>
                  <Text style={{ color: foreground }}>
                    Tu descenso:{' '}
                    {
                      snapshot.stops.find(s => s.stopId === b.dropoffStopId)
                        ?.address
                    }
                  </Text>
                  <Text style={{ color: foreground }}>Reserva: {b.status}</Text>
                  {['pending', 'confirmed'].includes(b.status) &&
                    button(
                      'Cancelar reserva',
                      () => {
                        Alert.alert(
                          'Cancelar reserva',
                          '¿Quieres cancelar tu lugar en este viaje?',
                          [
                            { text: 'Conservar', style: 'cancel' },
                            {
                              text: 'Cancelar reserva',
                              style: 'destructive',
                              onPress: () =>
                                dispatch('cancel_booking', b.bookingId),
                            },
                          ],
                        );
                      },
                      model.busy || model.pending.length > 0,
                    )}
                </View>
              ))}
            {!terminal &&
              button('Activar avisos del viaje', () => {
                void registerTripNotifications()
                  .then(() =>
                    Alert.alert(
                      'Avisos activados',
                      'Este dispositivo quedó registrado.',
                    ),
                  )
                  .catch(cause =>
                    Alert.alert(
                      'Avisos pendientes',
                      cause instanceof Error
                        ? cause.message
                        : 'Intenta de nuevo con conexión',
                    ),
                  );
              })}
            {!terminal && button('Ayuda de seguridad', safety)}
            {terminal && (
              <Text style={{ color: foreground }}>
                El seguimiento ha terminado. Tu estado fue confirmado por KROW.
              </Text>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { minHeight: 48, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  map: { height: '42%', marginHorizontal: 12, borderRadius: 28, overflow: 'hidden' },
  card: { padding: 20, borderRadius: 24, gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginVertical: 4,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  vehicle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#315efb',
  },
});
