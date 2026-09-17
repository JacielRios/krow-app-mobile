import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { AnimatedModal, Button, FeedbackState, Skeleton } from '../../../../shared/components/ui-v2';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import { bookingApi } from '../../api/bookingApi';
import { RideCard } from '../../components/RideCard';
import { useRequestBooking, useSearchRides } from '../../hooks';
import type { AvailableRide } from '../../types/rideSearch.types';
import { PlacesAutocompleteInput, RoutePreviewMap } from '../../../maps';
import type { PlacesAutocompleteValue } from '../../../maps';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import { useTheme } from '../../../../shared/theme/ThemeProvider';

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
  const { theme } = useTheme();
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
  const [origin, setOrigin] = useState<PlacesAutocompleteValue | null>(null);
  const [destination, setDestination] = useState<PlacesAutocompleteValue | null>(null);

  const loadActiveBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const data = await bookingApi.activeRideIds();

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
      await Promise.all([
        search({
          maxResults: 50,
          origin: origin?.location,
          destination: destination?.location,
          maxDistanceKm: 8,
        }),
        loadActiveBookings(),
      ]);
    } catch {
      // Errores ya quedan reflejados en `searchError` y en el estado del hook
      // de bookings; este catch solo evita unhandled rejections.
    }
  }, [search, loadActiveBookings, origin?.location, destination?.location]);

  const handleSearch = () => {
    if (!origin || !destination) {
      Alert.alert('Ruta incompleta', 'Selecciona un origen y un destino para buscar coincidencias.');
      return;
    }
    loadAll().catch(() => undefined);
  };

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
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
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
            tintColor={theme.colors.primary}
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
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Viajes disponibles</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Encuentra un viaje publicado por otro estudiante y solicita unirte.
            </Text>
          </View>
        </View>

        <View style={[styles.searchPanel, { backgroundColor: theme.colors.surfaceRaised }]}> 
          <PlacesAutocompleteInput label="¿Desde dónde sales?" value={origin} onChange={setOrigin} />
          <PlacesAutocompleteInput label="¿A dónde vas?" value={destination} onChange={setDestination} bias={origin?.location} />
          <Button title="Buscar coincidencias" onPress={handleSearch} loading={searchLoading} />
        </View>

        {isInitialLoading ? (
          <View style={styles.centered} accessibilityLabel="Cargando viajes">
            <Skeleton height={112} />
            <Skeleton height={112} style={{ marginTop: spacing.md }} />
          </View>
        ) : searchError ? (
          <FeedbackState kind="error" title="No pudimos cargar los viajes" description={searchError} actionLabel="Reintentar" onAction={loadAll} />
        ) : sortedRides.length === 0 ? (
          <FeedbackState title="No hay viajes disponibles en este momento" description="Vuelve a intentarlo más tarde, o desliza hacia abajo para actualizar." />
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
  const { theme } = useTheme();

  return (
    <AnimatedModal
      visible={ride !== null}
      onDismissRequest={onClose}
      sheetStyle={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}
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
                        color={theme.colors.status.warning}
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
                  color={theme.colors.primary}
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
    </AnimatedModal>
  );
};

const DetailItem: React.FC<{
  iconName: string;
  label: string;
  value: string;
}> = ({ iconName, label, value }) => {
  const { theme } = useTheme();
  return <View style={styles.detailItem}>
    <MaterialIcons name={iconName} size={18} color={theme.colors.primary} />
    <View style={styles.detailItemText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchPanel: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
