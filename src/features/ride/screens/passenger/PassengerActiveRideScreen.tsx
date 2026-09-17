import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { RideCancelledModal } from '../../../../shared/components/ui/RideCancelledModal';
import { colors } from '../../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { RoutePreviewMap } from '../../../maps';
import { useActiveRideData } from '../../hooks';
import type {
  ActiveRideData,
  ActiveRideDriver,
} from '../../hooks/useActiveRideData';
import type { BookingStatus } from '../../types/booking.types';
import type { RideHeader } from '../../types/booking.types';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type PassengerActiveRideRouteProp = NativeStackScreenProps<
  MainStackParamList,
  'PassengerActiveRide'
>['route'];
type PassengerActiveRideNav = NativeStackNavigationProp<
  MainStackParamList,
  'PassengerActiveRide'
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

export const PassengerActiveRideScreen: React.FC = () => {
  const navigation = useNavigation<PassengerActiveRideNav>();
  const route = useRoute<PassengerActiveRideRouteProp>();
  const insets = useSafeAreaInsets();

  const { rideId } = route.params;

  const { data, loading, error, reload } = useActiveRideData(rideId);

  const [showCancelModal, setShowCancelModal] = useState(false);

  // El hook actualiza esta vista periódicamente desde KROW API. La pantalla
  // no conoce Supabase ni abre suscripciones adicionales.

  // Si la booking del pasajero pasa a `completed` → finalizó el viaje.
  useEffect(() => {
    if (!data || data.role !== 'pasajero') return;
    if (data.myBooking.status === 'completed') {
      navigation.replace('PassengerFinishedRide', { rideId });
    }
  }, [data, navigation, rideId]);

  // Si el conductor cancela el ride → modal bloqueante.
  useEffect(() => {
    if (!data || data.role !== 'pasajero') return;
    if (data.ride.status === 'cancelled') {
      setShowCancelModal(true);
    }
  }, [data]);

  const showInitialLoader = loading && !data;
  const passengerData =
    data && data.role === 'pasajero' ? data : null;

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <ScreenHeader
          ride={passengerData?.ride ?? null}
          onBack={() => navigation.goBack()}
        />

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
            <View style={styles.retryWrap}>
              <Button title="Reintentar" onPress={reload} />
            </View>
          </View>
        ) : passengerData ? (
          <PassengerContent data={passengerData} />
        ) : null}
      </ScrollView>

      <RideCancelledModal
        visible={showCancelModal}
        onDismiss={() => setShowCancelModal(false)}
      />
    </View>
  );
};

// =====================================================================
// Header
// =====================================================================

const ScreenHeader: React.FC<{
  ride: RideHeader | null;
  onBack: () => void;
}> = ({ ride, onBack }) => (
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
      <Text style={styles.title}>Tu viaje</Text>
      {ride && (
        <Text style={styles.subtitle} numberOfLines={2}>
          {(ride.originAddress ?? 'Origen') +
            ' → ' +
            (ride.destinationAddress ?? 'Destino')}
        </Text>
      )}
      {ride && (
        <View style={styles.headerMetaRow}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={styles.headerMetaText}>
            Sale {formatTime(ride.departureTime)}
          </Text>
        </View>
      )}
    </View>
  </View>
);

// =====================================================================
// Contenido principal del pasajero
// =====================================================================

const PassengerContent: React.FC<{
  data: Extract<ActiveRideData, { role: 'pasajero' }>;
}> = ({ data }) => {
  const { ride, myBooking, driver } = data;

  const origin =
    ride.originLat != null && ride.originLng != null
      ? { lat: ride.originLat, lng: ride.originLng }
      : null;
  const destination =
    ride.destinationLat != null && ride.destinationLng != null
      ? { lat: ride.destinationLat, lng: ride.destinationLng }
      : null;

  const dropoffPoint =
    myBooking.dropoffLat != null && myBooking.dropoffLng != null
      ? { lat: myBooking.dropoffLat, lng: myBooking.dropoffLng }
      : null;

  return (
    <>
      <View style={styles.mapWrap}>
        <RoutePreviewMap
          origin={origin}
          destination={destination}
          encodedPolyline={ride.routePolyline ?? null}
          extraMarkers={
            dropoffPoint
              ? [
                  {
                    id: `passenger-dropoff:${myBooking.bookingId}`,
                    point: dropoffPoint,
                    color: colors.primary,
                    iconName: 'flag',
                  },
                ]
              : undefined
          }
          height={220}
        />
      </View>

      {/* TODO: extraer a shared/components/ui/ConductorBlock para el ciclo
          de mantenimiento (mismo patrón usado en RideScheduledScreen). */}
      <DriverInfoBlock driver={driver} />

      <BookingStatusCard status={myBooking.status} />
    </>
  );
};

// =====================================================================
// Bloque del conductor (duplicado intencional vs. RideScheduledScreen)
// =====================================================================

const DriverInfoBlock: React.FC<{ driver: ActiveRideDriver }> = ({
  driver,
}) => {
  const name = driver.fullName ?? 'Conductor';
  const vehicleTitle =
    [driver.vehicleBrand, driver.vehicleModel].filter(Boolean).join(' ') ||
    'Vehículo';
  const vehicleDetails: string[] = [];
  if (driver.vehicleColor) vehicleDetails.push(driver.vehicleColor);
  if (driver.vehicleLicensePlate) vehicleDetails.push(driver.vehicleLicensePlate);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Conductor</Text>
      <View style={styles.driverRow}>
        <Avatar
          uri={driver.profilePhoto ?? undefined}
          name={name}
          size="md"
        />
        <View style={styles.driverRowText}>
          <Text style={styles.driverName} numberOfLines={1}>
            {name}
          </Text>
          {driver.rating != null && (
            <View style={styles.ratingRow}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.status.warning}
              />
              <Text style={styles.ratingText}>
                {driver.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.vehicleRow}>
        <View style={styles.vehicleIconWrap}>
          <MaterialIcons
            name="directions-car"
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.vehicleText}>
          <Text style={styles.vehicleTitle}>{vehicleTitle}</Text>
          {vehicleDetails.length > 0 && (
            <Text style={styles.vehicleSubtitle}>
              {vehicleDetails.join(' · ')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// =====================================================================
// Estado del viaje
// =====================================================================

const BookingStatusCard: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const message = statusMessageFor(status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardLabel}>Estado del viaje</Text>
        {renderStatusBadge(status)}
      </View>
      <Text style={styles.statusMessage}>{message}</Text>
    </View>
  );
};

const renderStatusBadge = (status: BookingStatus) => {
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

const statusMessageFor = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'El conductor está en camino a recogerte.';
    case 'in_progress':
      return 'Estás en el vehículo.';
    case 'completed':
      // Fallback raro: la navegación automática debe sacarnos antes.
      return 'El viaje fue completado.';
    case 'pending':
      return 'Aún esperando que el conductor confirme tu solicitud.';
    case 'rejected':
      return 'El conductor rechazó tu solicitud.';
    case 'cancelled':
      return 'Esta reserva fue cancelada.';
  }
};

// =====================================================================
// Estilos
// =====================================================================

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
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
    marginBottom: spacing.lg,
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
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  headerMetaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  mapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
  retryWrap: {
    marginTop: spacing.md,
    width: '60%',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRowText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  driverName: {
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
  statusMessage: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
});
