import React, { useEffect, useState } from 'react';
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
import { CommonActions } from '@react-navigation/native';
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
import { RideCancelledModal } from '../../../../shared/components/ui/RideCancelledModal';
import { rideApi } from '../../api/rideApi';
import {
  useRideScheduled,
  useUpdateBookingStatus,
} from '../../hooks';
import type {
  BookingRequest,
  BookingStatus,
  RideHeader,
} from '../../types/booking.types';
import type {
  ConductorInfo,
  MyBooking,
  RideScheduledData,
  VehicleInfo,
} from '../../hooks/useRideScheduled';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RideScheduledRouteProp = NativeStackScreenProps<
  MainStackParamList,
  'RideScheduled'
>['route'];
type RideScheduledNav = NativeStackNavigationProp<
  MainStackParamList,
  'RideScheduled'
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

const renderBookingStatusBadge = (status: BookingStatus) => {
  switch (status) {
    case 'pending':
      return <StatusBadge status="pending" size="sm" />;
    case 'confirmed':
      return <StatusBadge tone="success" label="Confirmada" size="sm" />;
    case 'cancelled':
      return <StatusBadge status="cancelled" size="sm" />;
    case 'rejected':
      return <StatusBadge status="rejected" size="sm" />;
    case 'in_progress':
      return <StatusBadge status="in_progress" size="sm" />;
    case 'completed':
      return <StatusBadge status="completed" size="sm" />;
  }
};

export const RideScheduledScreen: React.FC = () => {
  const navigation = useNavigation<RideScheduledNav>();
  const route = useRoute<RideScheduledRouteProp>();
  const insets = useSafeAreaInsets();

  const { rideId } = route.params;

  const { data, loading, error, reload } = useRideScheduled(rideId);

  const [showCancelModal, setShowCancelModal] = useState(false);

  const showInitialLoader = loading && !data;

  // Pasajero: si el ride pasa a `in_progress`, lo redirigimos automáticamente
  // a la pantalla de viaje activo. La pantalla "scheduled" deja de tener
  // sentido para él en cuanto el viaje arrancó.
  useEffect(() => {
    if (!data || data.role !== 'pasajero') return;
    if (data.ride?.status === 'in_progress') {
      navigation.replace('PassengerActiveRide', { rideId });
    }
  }, [data, navigation, rideId]);

  // Pasajero: el conductor canceló el ride entero → modal bloqueante.
  // Sólo aplica al pasajero: el conductor que disparó la cancelación ya
  // recibió un `navigation.reset` directo en `DriverView.handleCancelRide`.
  useEffect(() => {
    if (!data || data.role !== 'pasajero') return;
    if (data.ride?.status === 'cancelled') {
      setShowCancelModal(true);
    }
  }, [data]);

  return (
    <>
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
        <ScreenHeader
          title={data?.role === 'pasajero' ? 'Tu reserva' : 'Solicitudes'}
          subtitle={data?.ride ? routeSummary(data.ride) : null}
          onBack={() => navigation.goBack()}
        />

        {data?.ride && data.role === 'conductor' && (
          <RideMetaCard ride={data.ride} />
        )}

        {showInitialLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centeredText}>Cargando…</Text>
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
        ) : data?.role === 'conductor' ? (
          <DriverView data={data} navigation={navigation} reload={reload} />
        ) : data?.role === 'pasajero' ? (
          <PassengerView data={data} reload={reload} />
        ) : null}
      </ScrollView>

      <RideCancelledModal
        visible={showCancelModal}
        onDismiss={() => setShowCancelModal(false)}
      />
    </>
  );
};

const routeSummary = (ride: RideHeader): string =>
  `${ride.originAddress ?? 'Origen'} → ${ride.destinationAddress ?? 'Destino'}`;

// =====================================================================
// Header común
// =====================================================================

const ScreenHeader: React.FC<{
  title: string;
  subtitle: string | null;
  onBack: () => void;
}> = ({ title, subtitle, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
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
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
  </View>
);

const RideMetaCard: React.FC<{ ride: RideHeader }> = ({ ride }) => (
  <View style={styles.metaCard}>
    <View style={styles.metaRow}>
      <MaterialIcons
        name="schedule"
        size={16}
        color={colors.text.secondary}
      />
      <Text style={styles.metaText}>Sale {formatTime(ride.departureTime)}</Text>
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
);

// =====================================================================
// Vista conductor
// =====================================================================

type DriverData = Extract<RideScheduledData, { role: 'conductor' }>;
type RideAction = null | 'starting' | 'cancelling';

const DriverView: React.FC<{
  data: DriverData;
  navigation: RideScheduledNav;
  reload: () => void;
}> = ({ data, navigation, reload }) => {
  const { ride, pendingBookings, confirmedBookings } = data;
  const { updateStatus } = useUpdateBookingStatus();
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [rideAction, setRideAction] = useState<RideAction>(null);

  const isBusy = actionBookingId !== null || rideAction !== null;
  const canStartRide =
    confirmedBookings.length > 0 &&
    ride?.status !== 'in_progress' &&
    ride?.status !== 'cancelled' &&
    ride?.status !== 'completed';

  const handleConfirm = async (booking: BookingRequest) => {
    if (isBusy) return;
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
    if (isBusy) return;
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

  const handleStartRide = async () => {
    if (isBusy || !ride) return;
    setRideAction('starting');
    try {
      await rideApi.start(ride.rideId);
    } catch (error: any) {
      setRideAction(null);
      Alert.alert('No se pudo iniciar el viaje', error?.message ?? 'Inténtalo de nuevo.');
      return;
    }
    setRideAction(null);
    navigation.replace('DriverActiveRide', { rideId: ride.rideId });
  };

  const handleCancelRide = () => {
    if (isBusy || !ride) return;
    Alert.alert(
      '¿Cancelar el viaje?',
      'Todos los pasajeros serán notificados.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setRideAction('cancelling');
            try {
              await rideApi.cancel(ride.rideId);
            } catch (error: any) {
              setRideAction(null);
              Alert.alert('Error', error?.message ?? 'No se pudo cancelar el viaje.');
              return;
            }
            setRideAction(null);
            // Reset stack a Home: el RideCancelledModal del Bloque C se
            // se refleja para los pasajeros al actualizar; el conductor regresa
            // limpio al inicio.
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              }),
            );
          },
        },
      ],
    );
  };

  return (
    <>
      {pendingBookings.length === 0 && confirmedBookings.length === 0 ? (
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
            count={pendingBookings.length}
            emptyMessage="No tienes solicitudes pendientes."
          >
            {pendingBookings.map(booking => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                showActions
                rideAvailableSeats={ride?.availableSeats ?? 0}
                onConfirm={() => handleConfirm(booking)}
                onReject={() => handleReject(booking)}
                busy={actionBookingId === booking.bookingId}
                anyActionBusy={isBusy}
              />
            ))}
          </Section>

          <Section
            title="Confirmadas"
            count={confirmedBookings.length}
            emptyMessage="Aún no has confirmado solicitudes."
          >
            {confirmedBookings.map(booking => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                showActions={false}
                rideAvailableSeats={ride?.availableSeats ?? 0}
                onConfirm={() => undefined}
                onReject={() => undefined}
                busy={false}
                anyActionBusy={isBusy}
              />
            ))}
          </Section>
        </>
      )}

      <View style={styles.driverActionStack}>
        {canStartRide && (
          <Button
            title={rideAction === 'starting' ? 'Iniciando…' : 'Iniciar viaje'}
            onPress={handleStartRide}
            loading={rideAction === 'starting'}
            disabled={isBusy}
          />
        )}
        <Button
          title={
            rideAction === 'cancelling' ? 'Cancelando…' : 'Cancelar viaje'
          }
          variant="outline"
          onPress={handleCancelRide}
          loading={rideAction === 'cancelling'}
          disabled={isBusy}
        />
      </View>
    </>
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
        {renderBookingStatusBadge(booking.status)}
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

// =====================================================================
// Vista pasajero
// =====================================================================

type PassengerData = Extract<RideScheduledData, { role: 'pasajero' }>;

const PassengerView: React.FC<{
  data: PassengerData;
  reload: () => void;
}> = ({ data, reload }) => {
  const { ride, myBooking, conductorInfo, vehicleInfo } = data;
  const { updateStatus } = useUpdateBookingStatus();
  const [cancelling, setCancelling] = useState(false);

  if (!ride || !myBooking) {
    return (
      <View style={styles.centered}>
        <MaterialIcons
          name="info-outline"
          size={32}
          color={colors.text.placeholder}
        />
        <Text style={styles.centeredText}>
          No encontramos tu reserva en este viaje. Si recién la cancelaste,
          regresa al inicio.
        </Text>
      </View>
    );
  }

  const handleCancelBooking = () => {
    if (cancelling) return;
    Alert.alert(
      'Cancelar reserva',
      '¿Seguro que quieres cancelar tu reserva en este viaje?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const { success, error: err } = await updateStatus(
              myBooking.bookingId,
              'cancelled',
            );
            setCancelling(false);
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

  const canCancel =
    myBooking.status !== 'cancelled' &&
    myBooking.status !== 'rejected' &&
    myBooking.status !== 'completed';

  return (
    <View>
      <RoutePanel ride={ride} />

      <View style={styles.passengerCard}>
        <View style={styles.passengerCardHeaderRow}>
          <Text style={styles.passengerCardLabel}>Conductor</Text>
        </View>
        <ConductorBlock conductor={conductorInfo} />
        {vehicleInfo && <VehicleBlock vehicle={vehicleInfo} />}
      </View>

      <View style={styles.passengerCard}>
        <View style={styles.passengerCardHeaderRow}>
          <Text style={styles.passengerCardLabel}>Estado de tu reserva</Text>
          {renderBookingStatusBadge(myBooking.status)}
        </View>
        <BookingStatusMessage booking={myBooking} />
      </View>

      {canCancel && (
        <View style={styles.passengerCancelWrap}>
          <Button
            title={cancelling ? 'Cancelando…' : 'Cancelar reserva'}
            variant="outline"
            onPress={handleCancelBooking}
            loading={cancelling}
            disabled={cancelling}
          />
        </View>
      )}
    </View>
  );
};

const RoutePanel: React.FC<{ ride: RideHeader }> = ({ ride }) => (
  <View style={styles.passengerCard}>
    <View style={styles.routeRow}>
      <MaterialIcons
        name="trip-origin"
        size={16}
        color={colors.primary}
        style={styles.routeIcon}
      />
      <Text style={styles.routeText} numberOfLines={2}>
        {ride.originAddress ?? 'Origen'}
      </Text>
    </View>
    <View style={styles.routeDivider} />
    <View style={styles.routeRow}>
      <MaterialIcons
        name="place"
        size={16}
        color={colors.status.error}
        style={styles.routeIcon}
      />
      <Text style={styles.routeText} numberOfLines={2}>
        {ride.destinationAddress ?? 'Destino'}
      </Text>
    </View>
    <View style={styles.routeFooter}>
      <MaterialIcons
        name="schedule"
        size={14}
        color={colors.text.secondary}
      />
      <Text style={styles.routeFooterText}>
        Sale {formatTime(ride.departureTime)}
      </Text>
    </View>
  </View>
);

const ConductorBlock: React.FC<{ conductor: ConductorInfo | null }> = ({
  conductor,
}) => {
  if (!conductor) {
    return (
      <Text style={styles.passengerEmptyText}>
        Información del conductor no disponible.
      </Text>
    );
  }
  const name = conductor.fullName ?? 'Conductor';
  return (
    <View style={styles.driverRow}>
      <Avatar
        uri={conductor.profilePhoto ?? undefined}
        name={name}
        size="md"
      />
      <View style={styles.driverRowText}>
        <Text style={styles.passengerName}>{name}</Text>
        {conductor.rating != null && (
          <View style={styles.ratingRow}>
            <MaterialIcons
              name="star"
              size={14}
              color={colors.status.warning}
            />
            <Text style={styles.ratingText}>
              {conductor.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const VehicleBlock: React.FC<{ vehicle: VehicleInfo }> = ({ vehicle }) => {
  const title =
    [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehículo';
  const detailsParts: string[] = [];
  if (vehicle.color) detailsParts.push(vehicle.color);
  if (vehicle.licensePlate) detailsParts.push(vehicle.licensePlate);
  return (
    <View style={styles.vehicleRow}>
      <View style={styles.vehicleIconWrap}>
        <MaterialIcons
          name="directions-car"
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.vehicleText}>
        <Text style={styles.vehicleTitle}>{title}</Text>
        {detailsParts.length > 0 && (
          <Text style={styles.vehicleSubtitle}>
            {detailsParts.join(' · ')}
          </Text>
        )}
      </View>
    </View>
  );
};

const BookingStatusMessage: React.FC<{ booking: MyBooking }> = ({
  booking,
}) => {
  switch (booking.status) {
    case 'pending':
      return (
        <Text style={styles.passengerStatusMessage}>
          Esperando que el conductor acepte tu solicitud.
        </Text>
      );
    case 'confirmed':
      return (
        <Text style={styles.passengerStatusMessage}>
          ¡Tu reserva fue confirmada! El conductor iniciará el viaje pronto.
        </Text>
      );
    case 'rejected':
      return (
        <Text style={styles.passengerStatusMessage}>
          El conductor rechazó tu solicitud. Puedes buscar otro viaje.
        </Text>
      );
    case 'cancelled':
      return (
        <Text style={styles.passengerStatusMessage}>
          Esta reserva fue cancelada.
        </Text>
      );
    case 'in_progress':
      return (
        <Text style={styles.passengerStatusMessage}>
          El viaje está en curso. Te redirigiremos en un momento…
        </Text>
      );
    case 'completed':
      return (
        <Text style={styles.passengerStatusMessage}>
          El viaje fue completado.
        </Text>
      );
  }
};

// =====================================================================
// Estilos
// =====================================================================

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
  driverActionStack: {
    rowGap: spacing.sm,
    marginTop: spacing.md,
  },
  // Vista pasajero
  passengerCard: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  passengerCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  passengerCardLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  passengerEmptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  passengerStatusMessage: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  passengerCancelWrap: {
    marginTop: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRowText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  vehicleText: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  vehicleSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIcon: {
    width: 24,
    marginRight: spacing.xs,
  },
  routeText: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  routeDivider: {
    height: 16,
    width: 1,
    backgroundColor: colors.border.default,
    marginLeft: 11,
    marginVertical: spacing.xs,
  },
  routeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  routeFooterText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
});
