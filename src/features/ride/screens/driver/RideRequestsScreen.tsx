import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

import { colors } from '../../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { Avatar } from '../../../../shared/components/ui/Avatar';
import { Button } from '../../../../shared/components/ui/Button';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import {
  useRideRealtime,
  useStartRide,
  useCancelRide,
  useUpdateBookingStatus,
} from '../../hooks';
import type { BookingRequest } from '../../types/booking.types';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import { activeRideStore } from '../../../../app/store/activeRideStore';

type RideRequestsRouteProp = NativeStackScreenProps<
  MainStackParamList,
  'RideRequests'
>['route'];
type RideRequestsNav = NativeStackNavigationProp<
  MainStackParamList,
  'RideRequests'
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

export const RideRequestsScreen: React.FC = () => {
  const navigation = useNavigation<RideRequestsNav>();
  const route = useRoute<RideRequestsRouteProp>();
  const insets = useSafeAreaInsets();

  const { rideId } = route.params;

  const {
    bookings,
    ride,
    loading,
    error,
    realtimeStatus,
    reload,
  } = useRideRealtime(rideId);

  const pending = useMemo(
    () => bookings.filter(b => b.status === 'pending'),
    [bookings],
  );
  const confirmed = useMemo(
    () => bookings.filter(b => b.status === 'confirmed'),
    [bookings],
  );

  const { updateStatus } = useUpdateBookingStatus();
  const { startRide, loading: starting } = useStartRide();
  const { cancelRide, loading: cancellingRide } = useCancelRide();
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const handleConfirm = async (booking: BookingRequest) => {
    if (actionBookingId) return;
    setActionBookingId(booking.bookingId);
    const { success, error: err } = await updateStatus(
      booking.bookingId,
      'confirmed',
    );
    setActionBookingId(null);
    if (!success) {
      Alert.alert('No se pudo confirmar', err ?? 'Inténtalo de nuevo.');
      return;
    }
    reload();
  };

  const handleReject = (booking: BookingRequest) => {
    if (actionBookingId) return;
    Alert.alert(
      'Rechazar solicitud',
      `¿Seguro que quieres rechazar la solicitud de ${
        booking.passenger.fullName ?? 'el pasajero'
      }?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActionBookingId(booking.bookingId);
            const { success, error: err } = await updateStatus(
              booking.bookingId,
              'rejected',
            );
            setActionBookingId(null);
            if (!success) {
              Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
              return;
            }
            reload();
          },
        },
      ],
    );
  };

  const canStart =
    (ride?.status === 'open' || ride?.status === 'full') &&
    confirmed.length > 0;

  const handleStartRide = () => {
    if (!ride || !canStart) return;
    Alert.alert(
      'Iniciar viaje',
      'Una vez iniciado, las solicitudes pendientes se cancelarán automáticamente. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            const { success, error: err } = await startRide(ride.rideId);
            if (!success) {
              Alert.alert('No se pudo iniciar', err ?? 'Inténtalo de nuevo.');
              return;
            }
            activeRideStore.setActiveRide({
              rideId: ride.rideId,
              role: 'conductor',
              status: 'in_progress',
            });
            navigation.replace('DriverActiveRide', { rideId: ride.rideId });
          },
        },
      ],
    );
  };

  const handleCancelRide = () => {
    if (!ride) return;
    Alert.alert(
      'Cancelar viaje',
      'Si cancelas, todas las reservas activas serán canceladas y los pasajeros notificados. Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar viaje',
          style: 'destructive',
          onPress: async () => {
            const { success, error: err } = await cancelRide(
              ride.rideId,
              'driver_action',
            );
            if (!success) {
              Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
              return;
            }
            activeRideStore.clear();
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  const showInitialLoader = loading && !ride && pending.length === 0 && confirmed.length === 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={reload}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Solicitudes</Text>
          {ride && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {(ride.originAddress ?? 'Origen') +
                ' → ' +
                (ride.destinationAddress ?? 'Destino')}
            </Text>
          )}
        </View>
      </View>

      {ride && (
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <MaterialIcons
              name="schedule"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              Sale {formatTime(ride.departureTime)}
            </Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <MaterialIcons
              name="event-seat"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.metaText}>
              {ride.availableSeats} asiento
              {ride.availableSeats === 1 ? '' : 's'} disponible
              {ride.availableSeats === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      )}

      {realtimeStatus === 'reconnecting' && (
        <View style={styles.rtBanner}>
          <ActivityIndicator size="small" color={colors.status.warning} />
          <Text style={styles.rtBannerText}>
            Reconectando en tiempo real…
          </Text>
        </View>
      )}

      {ride && canStart && (
        <View style={styles.startCta}>
          <Button
            title={starting ? 'Iniciando…' : 'Iniciar viaje'}
            onPress={handleStartRide}
            loading={starting}
            disabled={starting || cancellingRide}
          />
          <Text style={styles.startHint}>
            Tienes {confirmed.length} pasajero
            {confirmed.length === 1 ? '' : 's'} confirmado
            {confirmed.length === 1 ? '' : 's'}.
          </Text>
        </View>
      )}

      {ride && (ride.status === 'open' || ride.status === 'full') && (
        <TouchableOpacity
          onPress={handleCancelRide}
          disabled={cancellingRide}
          style={styles.cancelRideBtn}
        >
          <Text style={styles.cancelRideText}>
            {cancellingRide ? 'Cancelando viaje…' : 'Cancelar viaje'}
          </Text>
        </TouchableOpacity>
      )}

      {showInitialLoader ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centeredText}>Cargando solicitudes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons
            name="error-outline"
            size={32}
            color={colors.status.error}
          />
          <Text style={styles.centeredErrorText}>{error}</Text>
        </View>
      ) : pending.length === 0 && confirmed.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons
            name="inbox"
            size={48}
            color={colors.text.placeholder}
          />
          <Text style={styles.centeredTitle}>Sin solicitudes</Text>
          <Text style={styles.centeredText}>
            Aún no hay pasajeros que hayan solicitado unirse a este viaje.
          </Text>
        </View>
      ) : (
        <>
          <Section
            title="Pendientes"
            count={pending.length}
            emptyMessage="No tienes solicitudes pendientes."
          >
            {pending.map(booking => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                showActions
                rideAvailableSeats={ride?.availableSeats ?? 0}
                onConfirm={() => handleConfirm(booking)}
                onReject={() => handleReject(booking)}
                busy={actionBookingId === booking.bookingId}
                anyActionBusy={actionBookingId !== null}
              />
            ))}
          </Section>

          <Section
            title="Confirmadas"
            count={confirmed.length}
            emptyMessage="Aún no has confirmado solicitudes."
          >
            {confirmed.map(booking => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                showActions={false}
                rideAvailableSeats={ride?.availableSeats ?? 0}
                onConfirm={() => undefined}
                onReject={() => undefined}
                busy={false}
                anyActionBusy={actionBookingId !== null}
              />
            ))}
          </Section>
        </>
      )}
    </ScrollView>
  );
};

const Section: React.FC<{
  title: string;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
}> = ({ title, count, emptyMessage, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCountBadge}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
    {count === 0 ? (
      <Text style={styles.sectionEmpty}>{emptyMessage}</Text>
    ) : (
      children
    )}
  </View>
);

const BookingCard: React.FC<{
  booking: BookingRequest;
  showActions: boolean;
  rideAvailableSeats: number;
  onConfirm: () => void;
  onReject: () => void;
  busy: boolean;
  anyActionBusy: boolean;
}> = ({
  booking,
  showActions,
  rideAvailableSeats,
  onConfirm,
  onReject,
  busy,
  anyActionBusy,
}) => {
  const seatsAfterConfirm = rideAvailableSeats - booking.seatsReserved;
  const insufficientSeats = showActions && seatsAfterConfirm < 0;
  const passengerName = booking.passenger.fullName ?? 'Pasajero';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar
          uri={booking.passenger.profilePhoto ?? undefined}
          name={passengerName}
          size="md"
        />
        <View style={styles.cardHeaderText}>
          <Text style={styles.passengerName}>{passengerName}</Text>
          {booking.passenger.rating != null && (
            <View style={styles.ratingRow}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.status.warning}
              />
              <Text style={styles.ratingText}>
                {booking.passenger.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        {booking.status === 'confirmed' ? (
          <StatusBadge tone="success" label="Confirmada" size="sm" />
        ) : (
          <StatusBadge status="pending" size="sm" />
        )}
      </View>

      <View style={styles.metaRow}>
        <MaterialIcons
          name="event-seat"
          size={14}
          color={colors.text.secondary}
        />
        <Text style={styles.cardMetaText}>
          {booking.seatsReserved} asiento
          {booking.seatsReserved === 1 ? '' : 's'} reservado
          {booking.seatsReserved === 1 ? '' : 's'}
        </Text>
      </View>

      {insufficientSeats && (
        <View style={styles.warningBox}>
          <MaterialIcons
            name="warning-amber"
            size={16}
            color={colors.status.warning}
          />
          <Text style={styles.warningText}>
            Asientos insuficientes para confirmar (faltan{' '}
            {Math.abs(seatsAfterConfirm)}).
          </Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Button
              title="Rechazar"
              variant="outline"
              onPress={onReject}
              disabled={anyActionBusy}
            />
          </View>
          <View style={styles.actionItem}>
            <Button
              title={busy ? 'Procesando...' : 'Aceptar'}
              onPress={onConfirm}
              loading={busy}
              disabled={insufficientSeats || anyActionBusy}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  cardMetaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  metaSeparator: {
    width: 1,
    height: 20,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.sm,
  },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  centeredText: {
    marginTop: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  centeredErrorText: {
    marginTop: spacing.sm,
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sectionCountBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.status.infoLight,
    minWidth: 26,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: '#1D4ED8',
  },
  sectionEmpty: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  passengerName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warningLight,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  warningText: {
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    color: '#92400E',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    columnGap: spacing.sm,
    marginTop: spacing.md,
  },
  actionItem: {
    flex: 1,
  },
  rtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  rtBannerText: {
    fontSize: typography.size.sm,
    color: '#E65100',
  },
  startCta: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  startHint: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cancelRideBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cancelRideText: {
    color: colors.status.error,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
});
