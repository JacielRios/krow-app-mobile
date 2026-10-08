import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import Config from 'react-native-config';

import { colors } from '../../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Avatar } from '../../../../shared/components/ui/Avatar';
import {
  AnimatedModal,
  Button,
  Card,
  FeedbackState,
  Skeleton,
  Surface,
} from '../../../../shared/components/ui-v2';
import { ScreenHeader } from '../../../../shared/components/ui-v2/ScreenHeader';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import { bookingApi } from '../../api/bookingApi';
import { rideApi } from '../../api/rideApi';
import { RideCard } from '../../components/RideCard';
import { RideOriginSummary } from '../../components/RideOriginSummary';
import { CAMPUS_ORIGIN } from '../../domain/driverRideRules';
import { formatStopDistance } from '../../domain/formatStopDistance';
import { useRequestBooking, useSearchRides } from '../../hooks';
import type { AvailableRide, StopPair } from '../../types/rideSearch.types';
import { PlacePicker, RoutePreviewMap } from '../../../maps';
import type { PlacesAutocompleteValue } from '../../../maps';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RequestRideNav = NativeStackNavigationProp<
  MainStackParamList,
  'RequestRide'
>;

const formatDeparture = (iso: string): string =>
  new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
const formatPriceMxn = (value: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const RequestRideScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<RequestRideNav>();
  const insets = useSafeAreaInsets();
  const cache = useQueryClient();
  const scroll = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const bookingsRequest = useRef(0);
  const sendingRequest = useRef(false);
  const [stage, setStage] = useState<'route' | 'results'>('route');
  const [feedback, setFeedback] = useState('');
  const [destination, setDestination] =
    useState<PlacesAutocompleteValue | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(
    new Set(),
  );
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AvailableRide | null>(null);
  const [requestingRideId, setRequestingRideId] = useState<string | null>(null);
  const [stopPairs, setStopPairs] = useState<StopPair[]>([]);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [recommendedDropoffId, setRecommendedDropoffId] = useState<
    string | null
  >(null);
  const [stopOptionsLoading, setStopOptionsLoading] = useState(false);
  const [stopOptionsError, setStopOptionsError] = useState<string | null>(null);
  const [stopOptionsAttempt, setStopOptionsAttempt] = useState(0);
  const {
    rides,
    loading: searchLoading,
    error: searchError,
    search,
    reset,
  } = useSearchRides();
  const { requestBooking, loading: requesting } = useRequestBooking();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      bookingsRequest.current += 1;
    };
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  const loadActiveBookings = useCallback(async () => {
    const request = ++bookingsRequest.current;
    setBookingsLoading(true);
    try {
      const data = await bookingApi.activeRideIds();
      if (!mounted.current || request !== bookingsRequest.current) return;
      setRequestedRideIds(
        new Set(
          data
            .map(row => row?.ride_id)
            .filter((id): id is string => typeof id === 'string'),
        ),
      );
      setBookingsError(null);
    } catch {
      if (!mounted.current || request !== bookingsRequest.current) return;
      setBookingsError(
        'No pudimos comprobar tus reservas. Reintenta antes de solicitar un viaje.',
      );
    } finally {
      if (mounted.current && request === bookingsRequest.current)
        setBookingsLoading(false);
    }
  }, []);

  const loadAll = useCallback(
    async (forceSearch = false) => {
      await Promise.all([
        destination && (hasSearched || forceSearch)
          ? search({ maxResults: 50, destination: destination.location })
          : Promise.resolve([]),
        loadActiveBookings(),
      ]);
    },
    [destination, hasSearched, search, loadActiveBookings],
  );

  useFocusEffect(
    useCallback(() => {
      void loadActiveBookings();
    }, [loadActiveBookings]),
  );

  useEffect(() => {
    if (!selectedRide) return;
    const current = rides.find(ride => ride.rideId === selectedRide.rideId);
    if (!current) setSelectedRide(null);
    else if (current !== selectedRide) setSelectedRide(current);
  }, [rides, selectedRide]);

  const selectedRideId = selectedRide?.rideId;
  useEffect(() => {
    let active = true;
    setStopPairs([]);
    setSelectedPairIndex(0);
    setRecommendedDropoffId(null);
    setStopOptionsError(null);
    if (!selectedRideId || !destination) {
      setStopOptionsLoading(false);
      return;
    }
    setStopOptionsLoading(true);
    // Matching finds the nearest stop; this separate request returns every
    // available drop-off in the chosen trip, including stops beyond that radius.
    rideApi
      .stopOptions(selectedRideId, CAMPUS_ORIGIN.location, destination.location)
      .then(options => {
        if (!active) return;
        setStopPairs(options.pairs);
        setRecommendedDropoffId(options.recommendedDropoffStopId);
        const index = options.pairs.findIndex(
          pair => pair.dropoff.stopId === options.recommendedDropoffStopId,
        );
        setSelectedPairIndex(index < 0 ? 0 : index);
      })
      .catch(reason => {
        if (active)
          setStopOptionsError(
            reason instanceof Error
              ? reason.message
              : 'No pudimos consultar las paradas del viaje.',
          );
      })
      .finally(() => {
        if (active) setStopOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedRideId, destination, stopOptionsAttempt]);

  const handleSearch = () => {
    if (!destination) return;
    setHasSearched(true);
    setStage('results');
    void loadAll(true);
  };
  const retryStopOptions = () => {
    setStopOptionsLoading(true);
    setStopOptionsAttempt(value => value + 1);
  };
  const openRide = (ride: AvailableRide) => {
    setStopPairs([]);
    setStopOptionsLoading(true);
    setSelectedRide(ride);
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedRide) retryStopOptions();
    try {
      await loadAll();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const handleRequest = async () => {
    const ride = selectedRide;
    const pair = stopPairs[selectedPairIndex];
    if (
      !ride ||
      !pair ||
      searchLoading ||
      stopOptionsLoading ||
      stopOptionsError ||
      bookingsError ||
      bookingsLoading ||
      requestedRideIds.has(ride.rideId) ||
      sendingRequest.current
    )
      return;
    sendingRequest.current = true;
    setRequestingRideId(ride.rideId);
    try {
      const { bookingId, error } = await requestBooking({
        ride_id: ride.rideId,
        seats_reserved: 1,
        pickup_stop_id: pair.pickup.stopId,
        dropoff_stop_id: pair.dropoff.stopId,
      });
      if (!mounted.current) return;
      if (error || !bookingId) {
        Alert.alert(
          'No se pudo solicitar',
          error ?? 'Inténtalo de nuevo en un momento.',
        );
        // Recheck capacity and stop availability after concurrent ride changes.
        retryStopOptions();
        await loadAll(true);
        return;
      }
      await Promise.allSettled([
        cache.invalidateQueries({ queryKey: ['activity'] }),
        cache.invalidateQueries({ queryKey: ['recent-rides'] }),
        cache.invalidateQueries({ queryKey: ['active-ride'] }),
      ]);
      if (!mounted.current) return;
      setRequestedRideIds(previous => new Set(previous).add(ride.rideId));
      setSelectedRide(null);
      if (Config.KROW_PILOT_ENABLED === 'true')
        navigation.navigate('RideScheduled', { rideId: ride.rideId });
      else
        setFeedback('Solicitud enviada. El conductor debe confirmar tu lugar.');
    } finally {
      sendingRequest.current = false;
      if (mounted.current) setRequestingRideId(null);
    }
  };

  const isInitialLoading =
    (searchLoading || bookingsLoading) && rides.length === 0 && !refreshing;
  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            gap: 16,
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
        <ScreenHeader
          title={stage === 'route' ? '¿A dónde vamos?' : 'Viajes para ti'}
          subtitle={
            stage === 'route'
              ? 'Salimos del Tecnológico. Elige tu destino.'
              : 'Primero verás las paradas más cercanas a tu destino.'
          }
          onBack={() =>
            stage === 'route' ? navigation.goBack() : setStage('route')
          }
        />
        <Text
          style={{ color: theme.colors.textSecondary }}
          accessibilityLiveRegion="polite"
        >
          {stage === 'route'
            ? '1 de 2 · Tu destino'
            : '2 de 2 · Elige viaje y bajada'}
        </Text>
        {stage === 'route' ? (
          <Surface contentStyle={{ padding: 16, gap: 16 }}>
            <RideOriginSummary />
            <PlacePicker
              label="Destino"
              value={destination}
              bias={CAMPUS_ORIGIN.location}
              onChange={value => {
                setDestination(value);
                setSelectedRide(null);
                setHasSearched(false);
                setFeedback('');
                reset();
              }}
            />
            <Text style={{ color: theme.colors.textSecondary }}>
              Buscaremos viajes con alguna parada conveniente. Después podrás
              elegir dónde bajar.
            </Text>
            <Button
              title="Buscar viajes"
              disabled={!destination}
              onPress={handleSearch}
              loading={searchLoading}
            />
          </Surface>
        ) : (
          <Card>
            <View style={{ gap: 12 }}>
              <RideOriginSummary />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>
                Tu destino: {destination?.address}
              </Text>
              <Button
                title="Cambiar destino"
                variant="ghost"
                onPress={() => setStage('route')}
              />
            </View>
          </Card>
        )}
        {stage === 'results' && (
          <>
            {!!bookingsError && (
              <FeedbackState
                kind="error"
                title="Revisa tus reservas"
                description={bookingsError}
                actionLabel="Reintentar reservas"
                onAction={() => void loadActiveBookings()}
              />
            )}
            {isInitialLoading ? (
              <View style={{ gap: 16 }} accessibilityLabel="Cargando viajes">
                <Skeleton height={200} />
                <Skeleton height={200} />
              </View>
            ) : searchError && !rides.length ? (
              <FeedbackState
                kind="error"
                title="No pudimos cargar los viajes"
                description={searchError}
                actionLabel="Reintentar"
                onAction={() => void loadAll(true)}
              />
            ) : !rides.length ? (
              <FeedbackState
                title="No encontramos viajes compatibles"
                description="Todavía no hay viajes con paradas convenientes para ese destino. Prueba otra ubicación o vuelve más tarde."
                actionLabel="Cambiar destino"
                onAction={() => setStage('route')}
              />
            ) : (
              <>
                <Text
                  style={{
                    color: theme.colors.textPrimary,
                    fontSize: 22,
                    fontWeight: '600',
                  }}
                  accessibilityRole="header"
                >
                  {rides.length}{' '}
                  {rides.length === 1
                    ? 'viaje disponible'
                    : 'viajes disponibles'}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }}>
                  Ordenados por la parada más cercana. Las distancias son
                  aproximadas en línea recta.
                </Text>
                {!!searchError && (
                  <Text style={{ color: theme.colors.status.error }}>
                    No pudimos actualizar. Se conserva la última información.
                  </Text>
                )}
                {rides.map(ride => (
                  <RideCard
                    key={ride.rideId}
                    ride={ride}
                    alreadyRequested={requestedRideIds.has(ride.rideId)}
                    requesting={requestingRideId === ride.rideId}
                    onPress={() => openRide(ride)}
                    onRequest={() => openRide(ride)}
                  />
                ))}
              </>
            )}
          </>
        )}
        {!!feedback && (
          <Text
            style={{ color: theme.colors.textPrimary }}
            accessibilityLiveRegion="polite"
          >
            {feedback}
          </Text>
        )}
      </ScrollView>
      <RideDetailModal
        ride={selectedRide}
        requestedDestination={destination}
        alreadyRequested={
          selectedRide ? requestedRideIds.has(selectedRide.rideId) : false
        }
        requesting={requesting}
        stopPairs={stopPairs}
        selectedPairIndex={selectedPairIndex}
        recommendedDropoffId={recommendedDropoffId}
        onSelectPair={setSelectedPairIndex}
        stopOptionsLoading={
          stopOptionsLoading || bookingsLoading || searchLoading
        }
        stopOptionsError={bookingsError ?? stopOptionsError}
        onRetry={() => {
          retryStopOptions();
          void loadActiveBookings();
        }}
        onClose={() => {
          if (!requesting) setSelectedRide(null);
        }}
        onRequest={() => void handleRequest()}
      />
    </View>
  );
};

const RideDetailModal: React.FC<{
  ride: AvailableRide | null;
  requestedDestination: PlacesAutocompleteValue | null;
  alreadyRequested: boolean;
  requesting: boolean;
  stopPairs: StopPair[];
  selectedPairIndex: number;
  recommendedDropoffId: string | null;
  onSelectPair: (index: number) => void;
  stopOptionsLoading: boolean;
  stopOptionsError: string | null;
  onRetry: () => void;
  onClose: () => void;
  onRequest: () => void;
}> = ({
  ride,
  requestedDestination,
  alreadyRequested,
  requesting,
  stopPairs,
  selectedPairIndex,
  recommendedDropoffId,
  onSelectPair,
  stopOptionsLoading,
  stopOptionsError,
  onRetry,
  onClose,
  onRequest,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <AnimatedModal
      visible={ride !== null}
      onDismissRequest={onClose}
      sheetStyle={[
        styles.modalSheet,
        {
          paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: theme.colors.surfaceRaised,
        },
      ]}
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
              <Text
                style={[
                  styles.modalDriver,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {ride.driverName ?? 'Conductor'}
              </Text>
              {ride.driverRating != null && (
                <View style={styles.ratingRow}>
                  <MaterialIcons
                    name="star"
                    size={14}
                    color={theme.colors.status.warning}
                  />
                  <Text
                    style={[
                      styles.ratingText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
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
              interactive
              extraMarkers={[
                ...(stopPairs[0]
                  ? [
                      {
                        id: 'campus-pickup',
                        point: stopPairs[0].pickup.location,
                        color: theme.colors.status.success,
                        iconName: 'login',
                        accessibilityLabel:
                          'Subida en el Tecnológico: ' +
                          stopPairs[0].pickup.name,
                      },
                    ]
                  : []),
                ...(requestedDestination
                  ? [
                      {
                        id: 'requested-destination',
                        point: requestedDestination.location,
                        color: theme.colors.status.warning,
                        iconName: 'flag',
                        accessibilityLabel:
                          'Tu destino: ' + requestedDestination.address,
                      },
                    ]
                  : []),
                ...stopPairs.map((pair, index) => ({
                  id: 'dropoff-' + pair.dropoff.stopId,
                  point: pair.dropoff.location,
                  color:
                    index === selectedPairIndex
                      ? theme.colors.status.success
                      : theme.colors.primary,
                  iconName: 'directions-bus',
                  selected: index === selectedPairIndex,
                  label: String(index + 1),
                  accessibilityLabel: `Bajada ${index + 1}: ${
                    pair.dropoff.name
                  }. ${formatStopDistance(
                    pair.dropoff.distanceMeters,
                  )} aproximadamente de tu destino`,
                  onPress: () => {
                    if (!requesting && !stopOptionsLoading) onSelectPair(index);
                  },
                })),
              ]}
            />
          </View>

          <View
            style={[
              styles.modalRouteBlock,
              { backgroundColor: theme.colors.surfaceOverlay },
            ]}
          >
            <View style={styles.modalRouteRow}>
              <MaterialIcons
                name="trip-origin"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.modalRouteText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {ride.originAddress ?? 'Origen sin dirección'}
              </Text>
            </View>
            <View style={styles.modalRouteRow}>
              <MaterialIcons
                name="place"
                size={16}
                color={colors.status.error}
              />
              <Text
                style={[
                  styles.modalRouteText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {ride.destinationAddress ?? 'Destino sin dirección'}
              </Text>
            </View>
          </View>

          <View style={styles.modalDetailGrid}>
            <DetailItem
              iconName="flag"
              label="Tu destino"
              value={requestedDestination?.address ?? 'Destino seleccionado'}
            />
            {!!ride.corridorName && (
              <DetailItem
                iconName="alt-route"
                label="Avenida principal"
                value={ride.corridorName}
              />
            )}
            <DetailItem
              iconName="login"
              label="Subida en el Tecnológico"
              value={
                stopPairs[selectedPairIndex]?.pickup.name ??
                ride.bestPickupStop.name
              }
            />
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

          <Text
            style={[
              styles.stopOptionsTitle,
              { color: theme.colors.textPrimary },
            ]}
          >
            Elige dónde bajar
          </Text>
          <Text
            style={[
              styles.stopOptionsHint,
              { color: theme.colors.textSecondary },
            ]}
          >
            Puedes elegir cualquier parada habilitada de este viaje.
            Recomendamos la más cercana; las distancias son aproximadas en línea
            recta.
          </Text>
          {stopOptionsLoading ? (
            <Skeleton height={84} style={styles.stopOptionSkeleton} />
          ) : stopOptionsError ? (
            <FeedbackState
              kind="error"
              title="No pudimos cargar las paradas"
              description={stopOptionsError}
              actionLabel="Reintentar paradas"
              onAction={onRetry}
            />
          ) : stopPairs.length === 0 ? (
            <FeedbackState
              title="No hay bajadas disponibles"
              description="El conductor actualizó este viaje. Cierra el detalle y consulta otros viajes."
            />
          ) : (
            stopPairs.map((pair, index) => {
              const selected = index === selectedPairIndex;
              return (
                <TouchableOpacity
                  key={`${pair.pickup.stopId}-${pair.dropoff.stopId}`}
                  accessibilityRole="radio"
                  accessibilityLabel={`Bajada ${index + 1}: ${
                    pair.dropoff.name
                  }, ${formatStopDistance(
                    pair.dropoff.distanceMeters,
                  )} aproximadamente de tu destino${
                    pair.dropoff.stopId === recommendedDropoffId
                      ? ', recomendada'
                      : ''
                  }`}
                  accessibilityState={{ selected, disabled: requesting }}
                  disabled={requesting}
                  onPress={() => {
                    if (!stopOptionsLoading) onSelectPair(index);
                  }}
                  style={[
                    styles.stopOption,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.primarySoft
                        : theme.colors.surfaceRaised,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={
                      selected
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={22}
                    color={
                      selected ? theme.colors.primary : theme.colors.textMuted
                    }
                  />
                  <View style={styles.stopOptionCopy}>
                    <Text
                      style={[
                        styles.stopOptionName,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {index + 1}. {pair.dropoff.name}
                    </Text>
                    <Text
                      style={[
                        styles.stopOptionName,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {pair.dropoff.stopId === recommendedDropoffId
                        ? 'Recomendada · la más cercana'
                        : pair.dropoff.address}
                    </Text>
                    <Text
                      style={[
                        styles.stopOptionDistance,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatStopDistance(pair.dropoff.distanceMeters)} aprox.
                      de tu destino
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Button
            title={
              alreadyRequested
                ? 'Ya solicitaste este viaje'
                : requesting
                ? 'Enviando solicitud...'
                : 'Solicitar unirse'
            }
            onPress={onRequest}
            disabled={
              alreadyRequested ||
              requesting ||
              stopOptionsLoading ||
              !!stopOptionsError ||
              stopPairs.length === 0
            }
            loading={requesting}
            variant={alreadyRequested ? 'ghost' : 'primary'}
            style={styles.modalCta}
          />
          <Button
            title="Cerrar"
            variant="outline"
            disabled={requesting}
            onPress={onClose}
          />
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
  return (
    <View style={styles.detailItem}>
      <MaterialIcons name={iconName} size={18} color={theme.colors.primary} />
      <View style={styles.detailItemText}>
        <Text
          style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
        >
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
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
  stopOptionsTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  stopOptionsHint: {
    fontSize: typography.size.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  stopOptionSkeleton: {
    marginBottom: spacing.md,
  },
  stopOption: {
    minHeight: 84,
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stopOptionCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  stopOptionName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    marginBottom: 2,
  },
  stopOptionDistance: {
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
});
