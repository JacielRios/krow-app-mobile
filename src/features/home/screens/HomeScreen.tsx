import React, { useCallback, useState } from 'react';
import Config from 'react-native-config';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList } from '../../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useActiveRide } from '../hooks/useActiveRide';
import { useRecentRides } from '../hooks/useRecentRides';
import { bookingApi } from '../../ride/api/bookingApi';
import {
  ScreenContainer,
  Text,
  Card,
  Button,
  Skeleton,
  FeedbackState,
  StatusBadge,
} from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { rideDate, statusText } from '../../../shared/format';
export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { user, loading, error, reload } = useCurrentUserRole();
  const active = useActiveRide();
  const recent = useRecentRides(user?.role ?? null, user?.userId ?? null);
  const driver = user?.role === 'conductor';
  const requests = useQuery({
    queryKey: ['pending-count', user?.userId],
    queryFn: () => bookingApi.pendingCount(),
    enabled: driver,
  });
  const reloadRecent = recent.reload,
    reloadPending = requests.refetch;
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadRecent();
      if (driver) void reloadPending();
    }, [reload, reloadRecent, reloadPending, driver]),
  );
  const open = (rideId: string, status: string) =>
    navigation.navigate(
      status === 'in_progress'
        ? driver
          ? 'DriverActiveRide'
          : 'PassengerActiveRide'
        : [
            'completed',
            'cancelled',
            'rejected',
            'no_show',
            'interrupted',
          ].includes(status)
        ? Config.KROW_PILOT_ENABLED === 'true'
          ? 'RideHistory'
          : driver
          ? 'DriverFinishedRide'
          : 'PassengerFinishedRide'
        : 'RideScheduled',
      { rideId },
    );
  return (
    <ScreenContainer padded safeBottom={false}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 24, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.allSettled([
                reload(),
                recent.reload(),
                driver ? requests.refetch() : Promise.resolve(),
              ]).finally(() => setRefreshing(false));
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={{ gap: 8 }}>
          <Text tone="secondary">
            Hola, {user?.displayName ?? 'bienvenido'}
          </Text>
          <Text variant="display" accessibilityRole="header">
            Tu próximo destino
          </Text>
          <Text tone="secondary">
            {driver
              ? 'Comparte el camino con tu comunidad.'
              : 'Encuentra un viaje y llega con tranquilidad.'}
          </Text>
        </View>
        {Config.KROW_PILOT_ENABLED !== 'true' && (
          <Button
            title="Mi perfil y ajustes"
            variant="ghost"
            onPress={() => navigation.navigate('Profile')}
          />
        )}
        {loading && !user ? (
          <Skeleton height={180} />
        ) : error && !user ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tu cuenta"
            description={error}
            actionLabel="Reintentar"
            onAction={reload}
          />
        ) : (
          <>
            {active.activeRide && (
              <Card
                onPress={() =>
                  open(active.activeRide!.rideId, active.activeRide!.status)
                }
              >
                <View style={{ gap: 12 }}>
                  <StatusBadge
                    label={statusText(
                      active.activeRide.bookingStatus ??
                        active.activeRide.status,
                    )}
                    tone="info"
                  />
                  <Text variant="title">
                    {active.activeRide.status === 'in_progress'
                      ? 'Continúa tu viaje'
                      : 'Tu próximo encuentro'}
                  </Text>
                  <Text>
                    {active.activeRide.originAddress} →{' '}
                    {active.activeRide.destinationAddress}
                  </Text>
                  <Text tone="secondary">
                    {rideDate(active.activeRide.departureTime)}
                  </Text>
                  <Button
                    title={
                      active.activeRide.status === 'in_progress'
                        ? 'Ver ruta y paradas'
                        : 'Ver detalles'
                    }
                    onPress={() =>
                      open(active.activeRide!.rideId, active.activeRide!.status)
                    }
                  />
                </View>
              </Card>
            )}
            {!!active.error && (
              <Text tone="error" accessibilityLiveRegion="polite">
                No pudimos actualizar el viaje activo.
              </Text>
            )}
            <Card>
              <View style={{ gap: 16 }}>
                <Text variant="title">
                  {driver ? 'Publica tu recorrido' : 'Viaja con KROW'}
                </Text>
                <Text tone="secondary">
                  {driver
                    ? 'Elige ruta, horario y asientos. Revisa las solicitudes antes de salir.'
                    : 'Elige origen, destino y las paradas que mejor te convienen.'}
                </Text>
                <Button
                  title={driver ? 'Publicar viaje' : 'Buscar viaje'}
                  disabled={driver && !user?.canPublishRides}
                  onPress={() =>
                    driver
                      ? navigation.navigate('PublishRide')
                      : navigation.navigate('RequestRide')
                  }
                />
                {driver && !user?.canPublishRides && (
                  <Text tone="secondary">
                    Tu perfil necesita aprobación para publicar.
                  </Text>
                )}
                {driver && (
                  <Button
                    title="Mis rutas favoritas"
                    variant="outline"
                    onPress={() => navigation.navigate('FavoriteRoutes')}
                  />
                )}
              </View>
            </Card>
            {driver && (
              <Card>
                <Text variant="title">Solicitudes por revisar</Text>
                <Text tone="secondary">
                  {requests.error
                    ? 'No pudimos actualizar las solicitudes.'
                    : requests.data
                    ? requests.data.count + ' pendientes'
                    : 'Consultando…'}
                </Text>
              </Card>
            )}
            <Text variant="title" accessibilityRole="header">
              Últimos viajes
            </Text>
            {recent.loading && !recent.rides.length ? (
              <Skeleton height={120} />
            ) : !recent.rides.length ? (
              <FeedbackState
                title="Tu historial comienza aquí"
                description="Después de reservar o publicar, podrás consultar tus viajes."
              />
            ) : (
              recent.rides.map(r => (
                <Card
                  key={r.rideId}
                  onPress={() =>
                    open(
                      r.rideId,
                      r.bookingStatus &&
                        [
                          'completed',
                          'cancelled',
                          'rejected',
                          'no_show',
                          'interrupted',
                        ].includes(r.bookingStatus)
                        ? r.bookingStatus
                        : r.status,
                    )
                  }
                >
                  <View style={{ gap: 8 }}>
                    <StatusBadge
                      label={statusText(r.bookingStatus ?? r.status)}
                      tone="info"
                    />
                    <Text>
                      {r.originLabel} → {r.destinationLabel}
                    </Text>
                    <Text tone="secondary">{rideDate(r.departureTime)}</Text>
                    <Text variant="caption" tone="secondary">
                      Ver viaje →
                    </Text>
                  </View>
                </Card>
              ))
            )}
            {!!recent.error && (
              <Text tone="error">No se pudo actualizar el historial.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
