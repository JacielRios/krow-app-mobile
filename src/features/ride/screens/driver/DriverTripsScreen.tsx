import { AmbientBackground } from '../../../../shared/components/ui-v2';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import {
  Button,
  Card,
  FeedbackState,
  Skeleton,
  StatusBadge,
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

const statusLabel: Record<DriverRideListItem['status'], string> = {
  scheduled: 'Programado',
  full: 'Lleno',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
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
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <Button
            title="Volver"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Mis viajes
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Consulta, edita o continúa tus viajes publicados.
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.tabs,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}
        >
          {(Object.keys(labels) as Tab[]).map(item => (
            <Button
              key={item}
              title={labels[item]}
              size="sm"
              variant={tab === item ? 'primary' : 'ghost'}
              fullWidth={false}
              onPress={() => setTab(item)}
              style={styles.tab}
            />
          ))}
        </View>

        {loading ? (
          <>
            <Skeleton height={160} />
            <Skeleton height={160} style={{ marginTop: spacing.md }} />
          </>
        ) : error ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tus viajes"
            description={error}
            actionLabel="Reintentar"
            onAction={() => reload()}
          />
        ) : visible.length === 0 ? (
          <FeedbackState
            title="No hay viajes en esta sección"
            description={
              tab === 'upcoming'
                ? 'Publica un viaje para verlo aquí.'
                : 'Cuando cambien de estado aparecerán aquí.'
            }
          />
        ) : (
          visible.map(trip => (
            <Card
              key={trip.rideId}
              variant="outlined"
              style={styles.card}
              onPress={() => openTrip(trip)}
            >
              <View style={styles.cardHeader}>
                <StatusBadge
                  label={statusLabel[trip.status]}
                  tone={
                    trip.status === 'cancelled'
                      ? 'error'
                      : trip.status === 'completed'
                      ? 'success'
                      : 'info'
                  }
                  size="sm"
                />
                <Text
                  style={[styles.date, { color: theme.colors.textSecondary }]}
                >
                  {new Date(trip.departureTime).toLocaleString('es-MX')}
                </Text>
              </View>
              <Text style={[styles.route, { color: theme.colors.textPrimary }]}>
                {trip.originAddress ?? 'Origen'} →{' '}
                {trip.destinationAddress ?? 'Destino'}
              </Text>
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
                  variant="outline"
                  size="sm"
                  onPress={() => openTrip(trip)}
                />
                {trip.status === 'scheduled' && (
                  <Button
                    title={trip.canEdit ? 'Editar' : 'Edición bloqueada'}
                    size="sm"
                    disabled={!trip.canEdit}
                    leftIcon={
                      <MaterialIcons
                        name={trip.canEdit ? 'edit' : 'lock'}
                        size={18}
                        color={theme.colors.textInverse}
                      />
                    }
                    onPress={() =>
                      navigation.navigate('PublishRide', {
                        editRideId: trip.rideId,
                      })
                    }
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
          ))
        )}
        {!loading && hasMore && (
          <Button
            title="Cargar más viajes"
            variant="outline"
            loading={loadingMore}
            onPress={() => loadMore()}
          />
        )}
      </ScrollView>
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
  actions: { gap: spacing.sm, marginTop: spacing.md },
  blockReason: { fontSize: typography.size.sm, lineHeight: 18 },
});
