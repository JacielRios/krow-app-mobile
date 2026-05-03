import React, { useState } from 'react';
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
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { Avatar } from '../../../../shared/components/ui/Avatar';
import { Button } from '../../../../shared/components/ui/Button';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import {
  usePendingBookings,
  useUpdateBookingStatus,
} from '../../hooks';
import type { BookingRequest } from '../../types/booking.types';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

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
    pending,
    confirmed,
    ride,
    loading,
    error,
    reload,
  } = usePendingBookings(rideId);

  const { updateStatus } = useUpdateBookingStatus();
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
    // Realtime debería refrescar la lista, pero forzamos por si la suscripción
    // no llegó aún (p.ej. sin conexión websocket).
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
              'cancelled',
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
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  sectionEmpty: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    backgroundColor: '#FFF8E1',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
    color: '#E65100',
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
});
