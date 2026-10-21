import { IconButton } from '../../../../shared/components/ui-v2';
import { TripRoute, TripStatus } from '../../components/TripPresentation';
import { ScreenHeader } from '../../../../shared/components/ui-v2/ScreenHeader';
import { AmbientBackground } from '../../../../shared/components/ui-v2';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import {
  Button,
  Card,
  FeedbackState,
  Skeleton,
  SegmentedControl,
} from '../../../../shared/components/ui-v2';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { useDriverTrips } from '../../hooks';
import type { DriverRideListItem } from '../../types';

type Navigation = NativeStackNavigationProp<MainStackParamList, 'DriverTrips'>;
type Tab = 'upcoming' | 'active' | 'history';

const labels: Record<Tab, string> = {
  upcoming: 'Próximos',
  active: 'Activos',
  history: 'Historial',
};

export const DriverTripsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('upcoming');
  const { trips, loading, loadingMore, hasMore, loadMore, error, reload } =
    useDriverTrips(undefined, tab);

  const visible = useMemo(
    () =>
      trips.filter(trip =>
        tab === 'upcoming'
          ? trip.status === 'scheduled' || trip.status === 'full'
          : tab === 'active'
          ? trip.status === 'in_progress'
          : trip.status === 'completed' || trip.status === 'cancelled',
      ),
    [tab, trips],
  );

  const openTrip = (trip: DriverRideListItem) => {
    if (trip.status === 'in_progress') {
      navigation.navigate('DriverActiveRide', { rideId: trip.rideId });
    } else if (trip.status === 'completed' || trip.status === 'cancelled') {
      navigation.navigate('DriverFinishedRide', { rideId: trip.rideId });
    } else {
      navigation.navigate('RideScheduled', { rideId: trip.rideId });
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <FlatList
        data={visible}
        keyExtractor={trip => trip.rideId}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
          },
        ]}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <ScreenHeader
              title="Mis viajes"
              subtitle="Consulta, edita o continúa tus viajes publicados."
              onBack={() => navigation.goBack()}
            />
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={(Object.keys(labels) as Tab[]).map(value => ({
                value,
                label: labels[value],
              }))}
            />
            {!!error && !!visible.length && (
              <Text style={{ color: theme.colors.status.error }}>
                No pudimos actualizar. Se conserva la última información.
              </Text>
            )}
          </View>
        }
        renderItem={({ item: trip }) => (
          <Card
            variant="flat"
            style={[
              styles.card,
              {
                paddingVertical: 20,
                borderBottomWidth: 0.5,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <TripStatus status={trip.status} />
              <Text
                style={[styles.date, { color: theme.colors.textSecondary }]}
              >
                {new Date(trip.departureTime).toLocaleString('es-MX')}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <TripRoute
                origin={trip.originAddress}
                destination={trip.destinationAddress}
                compact
              />
            </View>
            <View style={styles.meta}>
              <Text style={{ color: theme.colors.textSecondary }}>
                {trip.availableSeats} asientos
              </Text>
              <Text style={{ color: theme.colors.textSecondary }}>
                ${(trip.pricePerSeatCents / 100).toFixed(2)} MXN
              </Text>
              {trip.activeBookings > 0 && (
                <Text style={{ color: theme.colors.textSecondary }}>
                  {trip.activeBookings} reservas activas
                </Text>
              )}
            </View>
            <View style={styles.actions}>
              <Button
                title="Ver viaje"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => openTrip(trip)}
              />
              {trip.status === 'scheduled' && (
                <IconButton
                  variant="plain"
                  size="sm"
                  disabled={!trip.canEdit}
                  onPress={() =>
                    navigation.navigate('PublishRide', {
                      editRideId: trip.rideId,
                    })
                  }
                  iconName={trip.canEdit ? 'edit' : 'lock-outline'}
                  accessibilityLabel={
                    trip.canEdit
                      ? 'Editar viaje'
                      : 'Edición bloqueada por reservas activas'
                  }
                  accessibilityHint="Abre los datos del viaje para modificarlos."
                />
              )}
              {trip.status === 'scheduled' && !trip.canEdit && (
                <Text
                  style={[
                    styles.blockReason,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Hay reservas activas; aún puedes cancelar desde el detalle.
                </Text>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton height={160} />
          ) : error ? (
            <FeedbackState
              kind="error"
              title="No pudimos cargar tus viajes"
              description={error}
              actionLabel="Reintentar"
              onAction={() => reload()}
            />
          ) : (
            <FeedbackState
              title="No hay viajes en esta sección"
              description={
                tab === 'upcoming'
                  ? 'Publica un viaje para verlo aquí.'
                  : 'Cuando cambien de estado aparecerán aquí.'
              }
            />
          )
        }
        ListFooterComponent={
          !loading && hasMore ? (
            <Button
              title="Cargar más"
              variant="ghost"
              loading={loadingMore}
              onPress={() => loadMore()}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  title: { fontSize: typography.size.xxl, fontWeight: typography.weight.bold },
  subtitle: { fontSize: typography.size.sm, lineHeight: 18, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: { flex: 1 },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: { fontSize: typography.size.sm, marginLeft: spacing.sm },
  route: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  blockReason: { fontSize: typography.size.sm, lineHeight: 18 },
});
