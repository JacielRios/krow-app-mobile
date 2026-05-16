import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { Avatar } from '../../../../shared/components/ui/Avatar';
import { Button } from '../../../../shared/components/ui/Button';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import { colors } from '../../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { useMyBooking, useUpdateBookingStatus } from '../../hooks';
import { activeRideStore } from '../../../../app/store/activeRideStore';
import {
  getBookingStatusCopy,
  getRideStatusCopy,
} from '../../utils/statusCopy';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RouteProp = NativeStackScreenProps<
  MainStackParamList,
  'PassengerWaiting'
>['route'];
type Nav = NativeStackNavigationProp<
  MainStackParamList,
  'PassengerWaiting'
>;

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const PassengerWaitingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const bookingId = route.params?.bookingId ?? null;

  const { booking, loading, error } = useMyBooking(bookingId);
  const { updateStatus, loading: cancelling } = useUpdateBookingStatus();

  // Cuando el viaje pasa a in_progress, navegamos automaticamente al active.
  useEffect(() => {
    if (!booking) return;
    if (booking.status === 'confirmed' && booking.ride.status === 'in_progress') {
      activeRideStore.setActiveRide({
        rideId: booking.rideId,
        role: 'pasajero',
        status: 'in_progress',
      });
      navigation.replace('PassengerActiveRide', { rideId: booking.rideId });
    } else if (
      booking.status === 'confirmed' &&
      booking.ride.status === 'completed'
    ) {
      navigation.replace('PassengerFinishedRide', { rideId: booking.rideId });
    }
  }, [
    booking?.status,
    booking?.ride.status,
    booking?.rideId,
    booking,
    navigation,
  ]);

  const handleCancel = () => {
    if (!booking) return;
    Alert.alert(
      'Cancelar solicitud',
      booking.status === 'confirmed'
        ? 'Si cancelas tu lugar reservado, el conductor recuperará el asiento. ¿Continuar?'
        : '¿Quieres cancelar tu solicitud pendiente?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const { success, error: err } = await updateStatus(
              booking.bookingId,
              'cancelled',
            );
            if (!success) {
              Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
              return;
            }
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  if (loading && !booking) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Cargando tu solicitud…</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons
          name="error-outline"
          size={32}
          color={colors.status.error}
        />
        <Text style={styles.errorText}>
          {error ?? 'No se encontró la solicitud.'}
        </Text>
        <Button
          title="Volver"
          variant="outline"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const isTerminal = booking.status === 'cancelled';
  const rideTerminal =
    booking.ride.status === 'cancelled' || booking.ride.status === 'completed';
  const showCancel =
    booking.status === 'pending' || booking.status === 'confirmed';

  const bookingCopy = getBookingStatusCopy(booking.status, 'pasajero');
  const rideCopy = getRideStatusCopy(booking.ride.status, 'pasajero');

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.body,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Tu solicitud</Text>
        <StatusBadge status={booking.status} size="sm" />
      </View>

      <View style={styles.statusCard}>
        {booking.status === 'pending' && (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
        <Text style={styles.statusTitle}>{bookingCopy.label}</Text>
        <Text style={styles.statusMessage}>{bookingCopy.message}</Text>
        {rideTerminal && (
          <Text style={styles.statusMessage}>
            Estado del viaje: {rideCopy.label.toLowerCase()}.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.driverRow}>
          <Avatar
            uri={booking.ride.driver.profilePhoto ?? undefined}
            name={booking.ride.driver.fullName ?? 'Conductor'}
            size="md"
          />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {booking.ride.driver.fullName ?? 'Conductor'}
            </Text>
            {booking.ride.driver.vehicle && (
              <Text style={styles.muted}>
                {[
                  booking.ride.driver.vehicle.brand,
                  booking.ride.driver.vehicle.model,
                  booking.ride.driver.vehicle.licensePlate,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}
          </View>
          {booking.ride.driver.rating != null && (
            <View style={styles.ratingBadge}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.status.warning}
              />
              <Text style={styles.ratingText}>
                {booking.ride.driver.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <MaterialIcons
              name="trip-origin"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.routeText} numberOfLines={2}>
              {booking.ride.originAddress ?? 'Origen'}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <MaterialIcons name="place" size={16} color={colors.status.error} />
            <Text style={styles.routeText} numberOfLines={2}>
              {booking.ride.destinationAddress ?? 'Destino'}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="schedule"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              {formatTime(booking.ride.departureTime)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="event-seat"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              {booking.seatsReserved} asiento
              {booking.seatsReserved === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="payments"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              ${booking.ride.pricePerSeat.toFixed(0)} MXN
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {booking.status === 'confirmed' &&
          booking.ride.status === 'in_progress' && (
            <Button
              title="Ver viaje en curso"
              onPress={() =>
                navigation.replace('PassengerActiveRide', {
                  rideId: booking.rideId,
                })
              }
            />
          )}
        {showCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelling}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>
              {cancelling ? 'Cancelando…' : 'Cancelar solicitud'}
            </Text>
          </TouchableOpacity>
        )}
        {isTerminal && (
          <Button
            title="Buscar otro viaje"
            onPress={() => navigation.replace('RequestRide')}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  body: {
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    rowGap: spacing.md,
  },
  muted: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    rowGap: spacing.sm,
    ...shadows.md,
  },
  statusTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statusMessage: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    rowGap: spacing.md,
    ...shadows.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 2,
    backgroundColor: colors.status.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  ratingText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  routeBlock: {
    rowGap: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  routeText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  metaText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  actions: {
    rowGap: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.status.error,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
});
