import React, { useCallback, useState } from 'react';
import Config from 'react-native-config';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { MainStackParamList } from '../../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useActiveRide } from '../hooks/useActiveRide';
import { useRecentRides } from '../hooks/useRecentRides';
import { bookingApi } from '../../ride/api/bookingApi';
import {
  ScreenContainer,
  Text,
  Surface,
  Button,
  Skeleton,
  FeedbackState,
  ListRow,
} from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../../../shared/components/ui/Avatar';
import {
  TripListItem,
  TripOverview,
} from '../../ride/components/TripPresentation';
import { pilotApi } from '../../pilot/pilotApi';
import { placeLabel } from '../../../shared/placeLabel';
import { useBookingInbox } from '../../pilot/useBookingInbox';
import { RequestsShortcut } from '../../pilot/RequestsShortcut';
export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { user, loading, error, reload } = useCurrentUserRole();
  const active = useActiveRide();
  const recent = useRecentRides(user?.role ?? null, user?.userId ?? null);
  const missingAddresses = recent.rides.filter(
    ride =>
      placeLabel(ride.originLabel, '').unavailable ||
      placeLabel(ride.destinationLabel, '').unavailable,
  );
  const addressQueries = useQueries({
    queries: missingAddresses.map(ride => ({
      queryKey: ['ride-context', user?.userId, ride.rideId],
      queryFn: () => pilotApi.history(ride.rideId),
      enabled: !!user,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  });
  const addresses = new Map(
    missingAddresses.map((ride, index) => [
      ride.rideId,
      addressQueries[index].data?.ride,
    ]),
  );
  const driver = user?.role === 'conductor';
  const inbox = useBookingInbox(
    Config.KROW_PILOT_ENABLED === 'true' ? user?.userId : undefined,
  );
  const pending =
    inbox.data?.filter(item => item.role === 'driver' && item.canRespond)
      .length ?? 0;
  const requests = useQuery({
    queryKey: ['pending-count', user?.userId],
    queryFn: () => bookingApi.pendingCount(),
    enabled: driver && Config.KROW_PILOT_ENABLED !== 'true',
  });
  const reloadRecent = recent.reload,
    reloadPending =
      Config.KROW_PILOT_ENABLED === 'true' ? inbox.refetch : requests.refetch;
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
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32, gap: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.allSettled([
                reload(),
                recent.reload(),
                driver ? reloadPending() : Promise.resolve(),
              ]).finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text tone="secondary" variant="caption">
              Hola, {user?.displayName ?? 'bienvenido'}
            </Text>
            <Text
              accessibilityRole="header"
              variant="display"
              style={{ fontSize: 28, lineHeight: 34 }}
            >
              Tus recorridos
            </Text>
          </View>
          <Avatar name={user?.displayName} size="lg" />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: -12,
          }}
        >
          <Icon
            name={driver ? 'directions-car' : 'person-outline'}
            size={18}
            color={theme.colors.textSecondary}
          />
          <Text variant="caption" tone="secondary">
            {driver ? 'Modo conductor' : 'Modo pasajero'}
          </Text>
        </View>
        {Config.KROW_PILOT_ENABLED !== 'true' && (
          <Button
            title="Mi perfil y ajustes"
            variant="ghost"
            onPress={() => navigation.navigate('Profile')}
          />
        )}
        {Config.KROW_PILOT_ENABLED === 'true' && (
          <RequestsShortcut
            pending={pending}
            driver={driver}
            loading={inbox.isLoading && !inbox.data}
            error={inbox.isError}
            onPress={() => navigation.navigate('BookingRequests')}
          />
        )}
        {loading && !user ? (
          <Skeleton height={220} />
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
              <View style={{ gap: 12 }}>
                <TripOverview
                  status={
                    active.activeRide.bookingStatus ?? active.activeRide.status
                  }
                  origin={active.activeRide.originAddress}
                  destination={active.activeRide.destinationAddress}
                  departure={active.activeRide.departureTime}
                />
                <Button
                  title={
                    active.activeRide.status === 'in_progress'
                      ? 'Continuar viaje'
                      : 'Ver mi próximo viaje'
                  }
                  onPress={() =>
                    open(active.activeRide!.rideId, active.activeRide!.status)
                  }
                />
              </View>
            )}
            {!!active.error && (
              <Text tone="error" accessibilityLiveRegion="polite">
                No pudimos actualizar el viaje activo.
              </Text>
            )}
            <Surface
              radius={20}
              contentStyle={{
                padding: 20,
                backgroundColor: theme.colors.surface,
                gap: 16,
              }}
            >
              <View
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                <Icon
                  name={driver ? 'add-road' : 'search'}
                  size={30}
                  color={theme.colors.primary}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="title">
                    {driver ? 'Tu próxima salida' : 'Encuentra tu viaje'}
                  </Text>
                  <Text tone="secondary" variant="caption">
                    {driver
                      ? 'Desde el campus, con tu comunidad.'
                      : 'Elige tu destino y una parada cercana.'}
                  </Text>
                </View>
              </View>
              <Button
                title={driver ? 'Publicar viaje' : 'Buscar viaje'}
                variant={active.activeRide ? 'ghost' : 'primary'}
                disabled={driver && !user?.canPublishRides}
                onPress={() =>
                  driver
                    ? navigation.navigate('PublishRide')
                    : navigation.navigate('RequestRide')
                }
                iconName={driver ? 'add-road' : 'search'}
              />
              {driver && !user?.canPublishRides && (
                <Text variant="caption" tone="secondary">
                  {user?.offlineSavedAt
                    ? 'Conéctate para confirmar tu habilitación y publicar.'
                    : 'Tu perfil necesita aprobación para publicar.'}
                </Text>
              )}
            </Surface>
            {driver && (
              <View>
                <ListRow
                  title="Rutas favoritas"
                  subtitle="Reutiliza tus recorridos frecuentes"
                  leading={
                    <Icon
                      name="bookmark-border"
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  }
                  onPress={() => navigation.navigate('FavoriteRoutes')}
                />
                {Config.KROW_PILOT_ENABLED !== 'true' && (
                  <RequestsShortcut
                    driver
                    pending={requests.data?.count ?? 0}
                    loading={requests.isLoading && !requests.data}
                    error={requests.isError}
                    onPress={() => navigation.navigate('DriverTrips')}
                  />
                )}
              </View>
            )}
            <View>
              <Text variant="title" accessibilityRole="header">
                Actividad reciente
              </Text>
              {recent.loading && !recent.rides.length ? (
                <Skeleton height={120} />
              ) : !recent.rides.length ? (
                <FeedbackState
                  title="Aquí comienza tu actividad"
                  description="Tus recorridos aparecerán después de publicar o reservar."
                />
              ) : (
                recent.rides.map(r => (
                  <TripListItem
                    key={r.rideId}
                    origin={
                      addresses.get(r.rideId)?.origin_address ?? r.originLabel
                    }
                    destination={
                      addresses.get(r.rideId)?.destination_address ??
                      r.destinationLabel
                    }
                    departure={r.departureTime}
                    status={r.bookingStatus ?? r.status}
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
                  />
                ))
              )}
            </View>
            {!!recent.error && (
              <Text tone="error">No se pudo actualizar el historial.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
