import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { Avatar } from '../../../../shared/components/ui/Avatar';
import { Button } from '../../../../shared/components/ui/Button';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import { supabase } from '../../../../services/supabase';
import { RideCard } from '../../components/RideCard';
import { useRequestBooking, useSearchRides } from '../../hooks';
import type { AvailableRide } from '../../types/rideSearch.types';
import { RoutePreviewMap } from '../../../maps';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RequestRideNav = NativeStackNavigationProp<
  MainStackParamList,
  'RequestRide'
>;

const formatDeparture = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatPriceMxn = (value: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

interface ActiveBookingRow {
  ride_id: string;
  status: 'pending' | 'confirmed';
}

export const RequestRideScreen: React.FC = () => {
  const navigation = useNavigation<RequestRideNav>();
  const insets = useSafeAreaInsets();

  const {
    rides,
    loading: searchLoading,
    error: searchError,
    search,
  } = useSearchRides();
  const { requestBooking, loading: requesting } = useRequestBooking();

  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(
    new Set(),
  );
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AvailableRide | null>(null);
  const [requestingRideId, setRequestingRideId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadActiveBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const authRes = await supabase.auth.getUser();
      const userId = authRes?.data?.user?.id ?? null;

      if (!userId) {
        setRequestedRideIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('ride_id, status')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed']);

      if (error || !data) {
        // Si RLS o red fallan, no hay manera de saber qué ya solicitó el
        // usuario; conservamos el set anterior en lugar de vaciarlo, para
        // no presentar un botón "Solicitar" sobre un ride que ya tenía.
        return;
      }

      const ids = new Set(
        (data as ActiveBookingRow[])
          .map(row => row?.ride_id)
          .filter((id): id is string => typeof id === 'string'),
      );
      setRequestedRideIds(ids);
    } catch {
      // Silencio defensivo: degradar sin crashear el screen.
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([search({ maxResults: 50 }), loadActiveBookings()]);
    } catch {
      // Errores ya quedan reflejados en `searchError` y en el estado del hook
      // de bookings; este catch solo evita unhandled rejections.
    }
  }, [search, loadActiveBookings]);

  // Recarga cuando la pantalla recupera el foco (evita stale data al volver
  // desde otras pantallas o si se canceló una booking).
  useFocusEffect(
    useCallback(() => {
      loadAll().catch(() => undefined);
    }, [loadAll]),
  );

  useEffect(() => {
    if (selectedRide) {
      const stillExists = rides.find(
        r => r.rideId === selectedRide.rideId,
      );
      if (!stillExists) {
        setSelectedRide(null);
      } else if (stillExists !== selectedRide) {
        setSelectedRide(stillExists);
      }
    }
  }, [rides, selectedRide]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequest = async (ride: AvailableRide) => {
    if (requestedRideIds.has(ride.rideId)) return;

    setRequestingRideId(ride.rideId);
    const { bookingId, error } = await requestBooking({
      ride_id: ride.rideId,
      seats_reserved: 1,
    });
    setRequestingRideId(null);

    if (error || !bookingId) {
      Alert.alert(
        'No se pudo solicitar',
        error ?? 'Inténtalo de nuevo en un momento.',
      );
      return;
    }

    setRequestedRideIds(prev => {
      const next = new Set(prev);
      next.add(ride.rideId);
      return next;
    });
    setSelectedRide(null);
    Alert.alert(
      'Solicitud enviada',
      'Tu solicitud está pendiente de confirmación por el conductor.',
    );
  };

  const isInitialLoading =
    (searchLoading || bookingsLoading) && rides.length === 0 && !refreshing;

  const sortedRides = useMemo(
    () =>
      [...rides].sort(
        (a, b) =>
          new Date(a.departureTime).getTime() -
          new Date(b.departureTime).getTime(),
      ),
    [rides],
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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
            <Text style={styles.title}>Viajes disponibles</Text>
            <Text style={styles.subtitle}>
              Encuentra un viaje publicado por otro estudiante y solicita unirte.
            </Text>
          </View>
        </View>

        {isInitialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centeredText}>Cargando viajes...</Text>
          </View>
        ) : searchError ? (
          <View style={styles.centered}>
            <MaterialIcons
              name="error-outline"
              size={32}
              color={colors.status.error}
            />
            <Text style={styles.centeredErrorText}>{searchError}</Text>
            <View style={styles.spacerLg} />
            <Button title="Reintentar" onPress={loadAll} />
          </View>
        ) : sortedRides.length === 0 ? (
          <View style={styles.centered}>
            <MaterialIcons
              name="search-off"
              size={48}
              color={colors.text.placeholder}
            />
            <Text style={styles.centeredTitle}>
              No hay viajes disponibles en este momento
            </Text>
            <Text style={styles.centeredText}>
              Vuelve a intentarlo más tarde, o desliza hacia abajo para
              actualizar.
            </Text>
          </View>
        ) : (
          sortedRides.map(ride => (
            <RideCard
              key={ride.rideId}
              ride={ride}
              alreadyRequested={requestedRideIds.has(ride.rideId)}
              requesting={requestingRideId === ride.rideId}
              onPress={() => setSelectedRide(ride)}
              onRequest={() => handleRequest(ride)}
            />
          ))
        )}
      </ScrollView>

      <RideDetailModal
        ride={selectedRide}
        alreadyRequested={
          selectedRide ? requestedRideIds.has(selectedRide.rideId) : false
        }
        requesting={
          selectedRide && requestingRideId === selectedRide.rideId
            ? true
            : requesting
        }
        onClose={() => setSelectedRide(null)}
        onRequest={() => selectedRide && handleRequest(selectedRide)}
      />
    </View>
  );
};

const RideDetailModal: React.FC<{
  ride: AvailableRide | null;
  alreadyRequested: boolean;
  requesting: boolean;
  onClose: () => void;
  onRequest: () => void;
}> = ({ ride, alreadyRequested, requesting, onClose, onRequest }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={ride !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalSheet,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          onPress={() => undefined}
        >
          <View style={styles.modalHandle} />
          {ride && (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Avatar name={ride.driverName ?? 'Conductor'} size="lg" />
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalDriver}>
                    {ride.driverName ?? 'Conductor'}
                  </Text>
                  {ride.driverRating != null && (
                    <View style={styles.ratingRow}>
                      <MaterialIcons
                        name="star"
                        size={14}
                        color={colors.status.warning}
                      />
                      <Text style={styles.ratingText}>
                        {ride.driverRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                <StatusBadge tone="info" label="Programado" size="sm" />
              </View>

              <View style={styles.modalMapWrap}>
                <RoutePreviewMap
                  origin={ride.origin}
                  destination={ride.destination}
                  encodedPolyline={ride.routePolyline}
                  height={200}
                />
              </View>

              <View style={styles.modalRouteBlock}>
                <View style={styles.modalRouteRow}>
                  <MaterialIcons
                    name="trip-origin"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.modalRouteText}>
                    {ride.originAddress ?? 'Origen sin dirección'}
                  </Text>
                </View>
                <View style={styles.modalRouteRow}>
                  <MaterialIcons
                    name="place"
                    size={16}
                    color={colors.status.error}
                  />
                  <Text style={styles.modalRouteText}>
                    {ride.destinationAddress ?? 'Destino sin dirección'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDetailGrid}>
                <DetailItem
                  iconName="schedule"
                  label="Salida"
                  value={formatDeparture(ride.departureTime)}
                />
                <DetailItem
                  iconName="event-seat"
                  label="Asientos"
                  value={`${ride.availableSeats} disponible${
                    ride.availableSeats === 1 ? '' : 's'
                  }`}
                />
                <DetailItem
                  iconName="payments"
                  label="Precio"
                  value={`${formatPriceMxn(ride.pricePerSeat)} / asiento`}
                />
                {ride.vehicle && (
                  <DetailItem
                    iconName="directions-car"
                    label="Vehículo"
                    value={[
                      ride.vehicle.brand,
                      ride.vehicle.model,
                      ride.vehicle.licensePlate,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                )}
              </View>

              <Button
                title={
                  alreadyRequested
                    ? 'Ya solicitaste este viaje'
                    : requesting
                    ? 'Enviando solicitud...'
                    : 'Solicitar unirse'
                }
                onPress={onRequest}
                disabled={alreadyRequested || requesting}
                loading={requesting}
                variant={alreadyRequested ? 'ghost' : 'primary'}
                style={styles.modalCta}
              />
              <Button title="Cerrar" variant="outline" onPress={onClose} />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const DetailItem: React.FC<{
  iconName: string;
  label: string;
  value: string;
}> = ({ iconName, label, value }) => (
  <View style={styles.detailItem}>
    <MaterialIcons name={iconName} size={18} color={colors.primary} />
    <View style={styles.detailItemText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  flex: {
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
    lineHeight: 18,
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
    textAlign: 'center',
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
  spacerLg: { height: spacing.lg },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border.default,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  modalDriver: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalMapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  modalRouteBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    rowGap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  modalRouteText: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  modalDetailGrid: {
    rowGap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.sm,
  },
  detailItemText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: typography.size.md,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },
  modalCta: {
    marginTop: spacing.sm,
  },
});
