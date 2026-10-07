import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {
  AnimatedModal,
  Button,
  FeedbackState,
  Skeleton,
} from '../../../../shared/components/ui-v2';
import { StatusBadge } from '../../../../shared/components/ui/StatusBadge';
import { bookingApi } from '../../api/bookingApi';
import { rideApi } from '../../api/rideApi';
import { RideCard } from '../../components/RideCard';
import { useRequestBooking, useSearchRides } from '../../hooks';
import type {
  AvailableRide,
  PassengerStopCandidate,
  PassengerStopCandidates,
  StopPair,
} from '../../types/rideSearch.types';
import { PlacePicker, RoutePreviewMap } from '../../../maps';
import type { PlacesAutocompleteValue } from '../../../maps';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { Card, Surface } from '../../../../shared/components/ui-v2';
import { ScreenHeader } from '../../../../shared/components/ui-v2/ScreenHeader';
import { useQueryClient } from '@tanstack/react-query';
import Config from 'react-native-config';
import { CAMPUS_ORIGIN } from '../../domain/driverRideRules';
import { RideOriginSummary } from '../../components/RideOriginSummary';

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

interface ActiveBookingRow {
  ride_id: string;
  status: 'pending' | 'confirmed';
}

const EMPTY_CANDIDATES: PassengerStopCandidates = {
  radiusMeters: 1000,
  pickupStops: [],
  dropoffStops: [],
  pairs: [],
};

export const RequestRideScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<RequestRideNav>();
  const insets = useSafeAreaInsets();
  const cache = useQueryClient();
  const scroll = useRef<ScrollView>(null);
  const [stage, setStage] = useState<'route' | 'stops' | 'results'>('route');
  const [feedback, setFeedback] = useState('');
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [candidateAttempt, setCandidateAttempt] = useState(0);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  const {
    rides,
    loading: searchLoading,
    error: searchError,
    search,
    reset,
  } = useSearchRides();
  const { requestBooking, loading: requesting } = useRequestBooking();

  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(
    new Set(),
  );
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AvailableRide | null>(null);
  const [requestingRideId, setRequestingRideId] = useState<string | null>(null);
  const sendingRequest = useRef(false);
  const mounted = useRef(true);
  const bookingsRequest = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const origin = CAMPUS_ORIGIN;
  const [destination, setDestination] =
    useState<PlacesAutocompleteValue | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [stopPairs, setStopPairs] = useState<StopPair[]>([]);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [stopOptionsLoading, setStopOptionsLoading] = useState(false);
  const [stopOptionsError, setStopOptionsError] = useState<string | null>(null);
  const [stopCandidates, setStopCandidates] =
    useState<PassengerStopCandidates>(EMPTY_CANDIDATES);
  const [stopCandidatesLoading, setStopCandidatesLoading] = useState(false);
  const [stopCandidatesError, setStopCandidatesError] = useState<string | null>(
    null,
  );
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [selectedDropoffId, setSelectedDropoffId] = useState<string | null>(
    null,
  );
  const [pickupScope, setPickupScope] = useState<'campus' | 'route'>('campus');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      bookingsRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!destination) {
      setStopCandidates(EMPTY_CANDIDATES);
      setSelectedPickupId(null);
      setSelectedDropoffId(null);
      setStopCandidatesError(null);
      setStopCandidatesLoading(false);
      return;
    }
    setStopCandidatesLoading(true);
    setStopCandidatesError(null);
    rideApi
      .stopCandidates(origin.location, destination.location, { pickupScope })
      .then(result => {
        if (!active) return;
        setStopCandidates(result);
        const recommendedPair = result.pairs[0];
        setSelectedPickupId(recommendedPair?.pickupStopId ?? null);
        setSelectedDropoffId(recommendedPair?.dropoffStopId ?? null);
      })
      .catch(reason => {
        if (!active) return;
        setStopCandidates(EMPTY_CANDIDATES);
        setSelectedPickupId(null);
        setSelectedDropoffId(null);
        setStopCandidatesError(
          reason?.message ?? 'No pudimos consultar las paradas cercanas.',
        );
      })
      .finally(() => {
        if (active) setStopCandidatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [destination, origin, candidateAttempt, pickupScope]);

  const loadActiveBookings = useCallback(async () => {
    const request = ++bookingsRequest.current;
    setBookingsLoading(true);
    try {
      const data = await bookingApi.activeRideIds();
      if (!mounted.current || request !== bookingsRequest.current) return;

      const ids = new Set(
        (data as ActiveBookingRow[])
          .map(row => row?.ride_id)
          .filter((id): id is string => typeof id === 'string'),
      );
      setRequestedRideIds(ids);
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
      try {
        const searchPromise =
          destination && (hasSearched || forceSearch)
            ? search({
                maxResults: 50,
                origin:
                  stopCandidates.pickupStops.find(
                    stop => stop.stopId === selectedPickupId,
                  )?.location ?? origin.location,
                destination: destination.location,
                maxDistanceKm: 1,
                pickupTransportStopId: selectedPickupId ?? undefined,
                dropoffTransportStopId: selectedDropoffId ?? undefined,
              })
            : Promise.resolve([]);
        await Promise.all([searchPromise, loadActiveBookings()]);
      } catch {
        // Errores ya quedan reflejados en `searchError` y en el estado del hook
        // de bookings; este catch solo evita unhandled rejections.
      }
    },
    [
      search,
      loadActiveBookings,
      origin,
      destination,
      hasSearched,
      selectedPickupId,
      selectedDropoffId,
      stopCandidates.pickupStops,
    ],
  );

  const handleSearch = () => {
    if (!destination) {
      Alert.alert(
        'Ruta incompleta',
        'Selecciona un destino para buscar coincidencias.',
      );
      return;
    }
    if (!selectedPickupId || !selectedDropoffId) {
      Alert.alert(
        'Sin paradas disponibles',
        'Selecciona una parada habilitada de subida y otra de bajada.',
      );
      return;
    }
    setHasSearched(true);
    setStage('results');
    loadAll(true).catch(() => undefined);
  };

  // Al recuperar el foco actualizamos reservas propias. La búsqueda se ejecuta
  // solo al pulsar el botón o al refrescar, evitando peticiones duplicadas.
  useFocusEffect(
    useCallback(() => {
      loadActiveBookings().catch(() => undefined);
    }, [loadActiveBookings]),
  );

  useEffect(() => {
    if (selectedRide) {
      const stillExists = rides.find(r => r.rideId === selectedRide.rideId);
      if (!stillExists) {
        setSelectedRide(null);
      } else if (stillExists !== selectedRide) {
        setSelectedRide(stillExists);
      }
    }
  }, [rides, selectedRide]);

  useEffect(() => {
    if (!selectedRide) {
      setStopPairs([]);
      setSelectedPairIndex(0);
      setStopOptionsError(null);
      return;
    }
    setStopOptionsLoading(false);
    setStopOptionsError(null);
    setStopPairs([
      {
        pickup: selectedRide.bestPickupStop,
        dropoff: selectedRide.bestDropoffStop,
      },
    ]);
    setSelectedPairIndex(0);
  }, [selectedRide]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const handleRequest = async (
    ride: AvailableRide,
    pair: StopPair | undefined,
  ) => {
    if (requestedRideIds.has(ride.rideId) || sendingRequest.current) return;
    if (!pair) {
      Alert.alert(
        'Selecciona tus paradas',
        'Elige un par válido de subida y bajada antes de solicitar.',
      );
      return;
    }

    sendingRequest.current = true;
    setRequestingRideId(ride.rideId);
    try {
      const { bookingId, error } = await requestBooking({
        ride_id: ride.rideId,
        seats_reserved: 1,
        pickup_stop_id: pair.pickup.stopId,
        dropoff_stop_id: pair.dropoff.stopId,
      });

      if (error || !bookingId) {
        if (!mounted.current) return;
        Alert.alert(
          'No se pudo solicitar',
          error ?? 'Inténtalo de nuevo en un momento.',
        );
        return;
      }

      await Promise.all([
        cache.invalidateQueries({ queryKey: ['activity'] }),
        cache.invalidateQueries({ queryKey: ['recent-rides'] }),
        cache.invalidateQueries({ queryKey: ['active-ride'] }),
      ]);
      if (!mounted.current) return;
      setRequestedRideIds(prev => {
        const next = new Set(prev);
        next.add(ride.rideId);
        return next;
      });
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

  const sortedRides = useMemo(
    () =>
      [...rides].sort(
        (a, b) =>
          new Date(a.departureTime).getTime() -
          new Date(b.departureTime).getTime(),
      ),
    [rides],
  );

  const [mapRole, setMapRole] = useState<'pickup' | 'dropoff'>('pickup');
  const mapStops = useMemo(() => {
    return mapRole === 'pickup'
      ? stopCandidates.pickupStops
      : stopCandidates.dropoffStops;
  }, [mapRole, stopCandidates]);
  const selectPickup = (stop: PassengerStopCandidate) => {
    const pair =
      stopCandidates.pairs.find(
        item =>
          item.pickupStopId === stop.stopId &&
          item.dropoffStopId === selectedDropoffId,
      ) ?? stopCandidates.pairs.find(item => item.pickupStopId === stop.stopId);
    if (!stop.enabled || !pair) return;
    setSelectedPickupId(stop.stopId);
    setSelectedDropoffId(pair.dropoffStopId);
    setHasSearched(false);
    reset();
  };
  const selectDropoff = (stop: PassengerStopCandidate) => {
    if (
      !stop.enabled ||
      !stopCandidates.pairs.some(
        pair =>
          pair.pickupStopId === selectedPickupId &&
          pair.dropoffStopId === stop.stopId,
      )
    )
      return;
    setSelectedDropoffId(stop.stopId);
    setHasSearched(false);
    reset();
  };

  const pickup = stopCandidates.pickupStops.find(
    stop => stop.stopId === selectedPickupId,
  );
  const dropoff = stopCandidates.dropoffStops.find(
    stop => stop.stopId === selectedDropoffId,
  );
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
          title={
            stage === 'route'
              ? '¿A dónde vamos?'
              : stage === 'stops'
              ? 'Elige tus paradas'
              : 'Viajes para ti'
          }
          subtitle={
            stage === 'route'
              ? 'Los viajes salen del Tecnológico. Elige a dónde vas.'
              : stage === 'stops'
              ? 'Confirma dónde subirás y dónde bajarás.'
              : 'Revisa el recorrido y solicita tu lugar.'
          }
          onBack={() =>
            stage === 'route'
              ? navigation.goBack()
              : setStage(stage === 'results' ? 'stops' : 'route')
          }
        />
        <Text
          style={{ color: theme.colors.textSecondary }}
          accessibilityLiveRegion="polite"
        >
          {stage === 'route'
            ? '1 de 3 · Tu recorrido'
            : stage === 'stops'
            ? '2 de 3 · Encuentro y descenso'
            : '3 de 3 · Elige un viaje'}
        </Text>
        {stage === 'route' ? (
          <Surface contentStyle={{ padding: 16, gap: 16 }}>
            <RideOriginSummary />
            <PlacePicker
              label="Destino"
              value={destination}
              bias={origin.location}
              onChange={value => {
                setDestination(value);
                setSelectedRide(null);
                setHasSearched(false);
                reset();
              }}
            />
            <Button
              title="Elegir paradas"
              disabled={!destination}
              onPress={() => setStage('stops')}
            />
          </Surface>
        ) : (
          <Card>
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.colors.textSecondary }}>
                Recorrido desde el Tecnológico
              </Text>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 16 }}>
                {origin.address} → {destination?.address}
              </Text>
              {stage === 'results' && (
                <>
                  <Text style={{ color: theme.colors.textPrimary }}>
                    Subida: {pickup?.name}
                  </Text>
                  <Text style={{ color: theme.colors.textPrimary }}>
                    Bajada: {dropoff?.name}
                  </Text>
                </>
              )}
              <Button
                title="Cambiar recorrido"
                variant="ghost"
                onPress={() => setStage('route')}
              />
            </View>
          </Card>
        )}
        {stage === 'stops' && (
          <>
            <Button
              title={
                pickupScope === 'campus'
                  ? 'Subir en otra parada'
                  : 'Subir en el Tecnológico'
              }
              variant="outline"
              onPress={() => {
                setPickupScope(value =>
                  value === 'campus' ? 'route' : 'campus',
                );
                setMapRole('pickup');
                setSelectedPickupId(null);
                setSelectedDropoffId(null);
                setHasSearched(false);
                setSelectedRide(null);
                reset();
              }}
            />
            {stopCandidatesLoading ? (
              <View
                style={{ gap: 12 }}
                accessibilityLabel="Buscando paradas cercanas"
              >
                <Skeleton height={260} />
                <Skeleton height={96} />
              </View>
            ) : stopCandidatesError ? (
              <FeedbackState
                kind="error"
                title="No pudimos cargar las paradas"
                description={stopCandidatesError}
                actionLabel="Reintentar"
                onAction={() => setCandidateAttempt(value => value + 1)}
              />
            ) : (
              <>
                <Text style={{ color: theme.colors.textSecondary }}>
                  {pickupScope === 'campus'
                    ? 'Elige tu encuentro cerca del Tecnológico y una parada de bajada cerca de tu destino.'
                    : 'El viaje sale del Tecnológico. Puedes abordar en una parada intermedia habilitada del recorrido.'}{' '}
                  Azul: disponible. Gris: sin viaje compatible.
                </Text>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
                >
                  <Button
                    title="Subida"
                    variant={mapRole === 'pickup' ? 'primary' : 'outline'}
                    fullWidth={false}
                    onPress={() => setMapRole('pickup')}
                    accessibilityState={{ selected: mapRole === 'pickup' }}
                  />
                  <Button
                    title="Bajada"
                    variant={mapRole === 'dropoff' ? 'primary' : 'outline'}
                    fullWidth={false}
                    onPress={() => setMapRole('dropoff')}
                    accessibilityState={{ selected: mapRole === 'dropoff' }}
                  />
                </View>
                <RoutePreviewMap
                  origin={null}
                  destination={null}
                  interactive
                  height={280}
                  extraMarkers={[
                    ...(origin
                      ? [
                          {
                            id: 'requested-origin',
                            point: origin.location,
                            iconName: 'trip-origin',
                            color: theme.colors.textSecondary,
                            accessibilityLabel:
                              'Origen solicitado: ' + origin.address,
                          },
                        ]
                      : []),
                    ...(destination
                      ? [
                          {
                            id: 'requested-destination',
                            point: destination.location,
                            iconName: 'place',
                            color: theme.colors.textSecondary,
                            accessibilityLabel:
                              'Destino solicitado: ' + destination.address,
                          },
                        ]
                      : []),
                    ...mapStops.map((stop, index) => ({
                      id: 'candidate-' + stop.stopId,
                      point: stop.location,
                      onPress: () =>
                        mapRole === 'pickup'
                          ? selectPickup(stop)
                          : selectDropoff(stop),
                      color:
                        stop.enabled &&
                        (mapRole === 'pickup' ||
                          stopCandidates.pairs.some(
                            pair =>
                              pair.pickupStopId === selectedPickupId &&
                              pair.dropoffStopId === stop.stopId,
                          ))
                          ? theme.colors.primary
                          : theme.colors.textMuted,
                      iconName: stop.enabled ? 'directions-bus' : 'block',
                      label: String(index + 1),
                      selected:
                        stop.stopId ===
                        (mapRole === 'pickup'
                          ? selectedPickupId
                          : selectedDropoffId),
                      accessibilityLabel:
                        `Parada ${index + 1}: ${stop.name}` +
                        (stop.stopId === selectedPickupId ||
                        stop.stopId === selectedDropoffId
                          ? '. Seleccionada'
                          : ''),
                    })),
                  ]}
                />
                {mapRole === 'pickup' ? (
                  <StopCandidateList
                    title="Parada de subida"
                    stops={stopCandidates.pickupStops}
                    selectedId={selectedPickupId}
                    onSelect={selectPickup}
                  />
                ) : (
                  <StopCandidateList
                    title="Parada de bajada"
                    stops={stopCandidates.dropoffStops}
                    selectedId={selectedDropoffId}
                    excludedId={selectedPickupId}
                    allowedIds={
                      new Set(
                        stopCandidates.pairs
                          .filter(
                            pair => pair.pickupStopId === selectedPickupId,
                          )
                          .map(pair => pair.dropoffStopId),
                      )
                    }
                    onSelect={selectDropoff}
                  />
                )}
                <Card>
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: theme.colors.textPrimary }}>
                      Subida: {pickup?.name ?? 'Selecciona una parada'}
                    </Text>
                    <Text style={{ color: theme.colors.textPrimary }}>
                      Bajada: {dropoff?.name ?? 'Selecciona una parada'}
                    </Text>
                    {pickup && pickupScope === 'campus' && (
                      <Text style={{ color: theme.colors.textSecondary }}>
                        {pickup.distanceMeters} m de la salida del Tecnológico
                      </Text>
                    )}
                    {dropoff && (
                      <Text style={{ color: theme.colors.textSecondary }}>
                        {dropoff.distanceMeters} m del destino solicitado
                      </Text>
                    )}
                  </View>
                </Card>
                <Button
                  title="Buscar viajes"
                  onPress={handleSearch}
                  loading={searchLoading}
                  disabled={!selectedPickupId || !selectedDropoffId}
                />
              </>
            )}
          </>
        )}
        {stage === 'results' && (
          <>
            {!!bookingsError && (
              <FeedbackState
                kind="error"
                title="Revisa tus reservas"
                description={bookingsError}
                actionLabel="Reintentar"
                onAction={() => void loadActiveBookings()}
              />
            )}
            {isInitialLoading ? (
              <View style={{ gap: 16 }} accessibilityLabel="Cargando viajes">
                <Skeleton height={200} />
                <Skeleton height={200} />
              </View>
            ) : searchError && !sortedRides.length ? (
              <FeedbackState
                kind="error"
                title="No pudimos cargar los viajes"
                description={searchError}
                actionLabel="Reintentar"
                onAction={() => void loadAll(true)}
              />
            ) : !sortedRides.length ? (
              <FeedbackState
                title="No encontramos viajes compatibles"
                description="Prueba otras paradas o un recorrido cercano."
                actionLabel="Cambiar paradas"
                onAction={() => setStage('stops')}
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
                  {sortedRides.length}{' '}
                  {sortedRides.length === 1
                    ? 'viaje disponible'
                    : 'viajes disponibles'}
                </Text>
                {!!searchError && (
                  <Text style={{ color: theme.colors.status.error }}>
                    No pudimos actualizar. Se conserva la última información.
                  </Text>
                )}
                {sortedRides.map(ride => (
                  <RideCard
                    key={ride.rideId}
                    ride={ride}
                    alreadyRequested={requestedRideIds.has(ride.rideId)}
                    requesting={requestingRideId === ride.rideId}
                    onPress={() => setSelectedRide(ride)}
                    onRequest={() => setSelectedRide(ride)}
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
        alreadyRequested={
          selectedRide ? requestedRideIds.has(selectedRide.rideId) : false
        }
        requesting={requesting}
        stopPairs={stopPairs}
        selectedPairIndex={selectedPairIndex}
        onSelectPair={setSelectedPairIndex}
        stopOptionsLoading={stopOptionsLoading || bookingsLoading}
        stopOptionsError={bookingsError ?? stopOptionsError}
        onClose={() => {
          if (!requesting) setSelectedRide(null);
        }}
        onRequest={() => {
          if (selectedRide && !bookingsError && !bookingsLoading)
            void handleRequest(selectedRide, stopPairs[selectedPairIndex]);
        }}
      />
    </View>
  );
};

const StopCandidateList: React.FC<{
  title: string;
  stops: PassengerStopCandidate[];
  selectedId: string | null;
  excludedId?: string | null;
  allowedIds?: ReadonlySet<string>;
  onSelect: (stop: PassengerStopCandidate) => void;
}> = ({ title, stops, selectedId, excludedId, allowedIds, onSelect }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.candidateSection}>
      <Text
        style={[styles.candidateTitle, { color: theme.colors.textPrimary }]}
      >
        {title}
      </Text>
      {stops.length === 0 ? (
        <Text
          style={[styles.candidateEmpty, { color: theme.colors.textSecondary }]}
        >
          No hay paradas disponibles para este recorrido.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
        >
          {stops.map((stop, index) => {
            const unavailable =
              !stop.enabled ||
              stop.stopId === excludedId ||
              (allowedIds != null && !allowedIds.has(stop.stopId));
            const selected = stop.stopId === selectedId;
            return (
              <TouchableOpacity
                key={`${stop.role}-${stop.stopId}`}
                accessibilityRole="radio"
                accessibilityLabel={`Parada ${index + 1}: ${stop.name}`}
                accessibilityState={{ selected, disabled: unavailable }}
                disabled={unavailable}
                onPress={() => onSelect(stop)}
                style={[
                  styles.candidateRow,
                  {
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.primarySoft
                      : theme.colors.surface,
                  },
                  unavailable && styles.candidateUnavailable,
                ]}
              >
                <MaterialIcons
                  name={
                    unavailable
                      ? 'block'
                      : selected
                      ? 'radio-button-checked'
                      : 'radio-button-unchecked'
                  }
                  size={21}
                  color={
                    unavailable ? theme.colors.textMuted : theme.colors.primary
                  }
                />
                <View style={styles.candidateCopy}>
                  <View style={styles.candidateNameRow}>
                    <Text
                      style={[
                        styles.candidateName,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {index + 1}. {stop.name}
                    </Text>
                    {stop.stopType === 'official_boarding_zone' ? (
                      <Text
                        style={[
                          styles.officialBadge,
                          {
                            color: theme.colors.primary,
                            backgroundColor: theme.colors.primarySoft,
                          },
                        ]}
                      >
                        Oficial
                      </Text>
                    ) : null}
                  </View>
                  {stop.address ? (
                    <Text
                      style={[
                        styles.candidateMeta,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {stop.address}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.candidateMeta,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {stop.distanceMeters} m ·{' '}
                    {stop.enabled
                      ? `${stop.rideCount} ruta${
                          stop.rideCount === 1 ? '' : 's'
                        }`
                      : 'Sin rutas disponibles'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const RideDetailModal: React.FC<{
  ride: AvailableRide | null;
  alreadyRequested: boolean;
  requesting: boolean;
  stopPairs: StopPair[];
  selectedPairIndex: number;
  onSelectPair: (index: number) => void;
  stopOptionsLoading: boolean;
  stopOptionsError: string | null;
  onClose: () => void;
  onRequest: () => void;
}> = ({
  ride,
  alreadyRequested,
  requesting,
  stopPairs,
  selectedPairIndex,
  onSelectPair,
  stopOptionsLoading,
  stopOptionsError,
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
              extraMarkers={
                stopPairs[selectedPairIndex]
                  ? [
                      {
                        id: 'pickup',
                        point: stopPairs[selectedPairIndex].pickup.location,
                        color: theme.colors.status.success,
                        iconName: 'login',
                      },
                      {
                        id: 'dropoff',
                        point: stopPairs[selectedPairIndex].dropoff.location,
                        color: theme.colors.status.error,
                        iconName: 'logout',
                      },
                    ]
                  : undefined
              }
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
            Elige dónde subir y bajar
          </Text>
          <Text
            style={[
              styles.stopOptionsHint,
              { color: theme.colors.textSecondary },
            ]}
          >
            Solo se muestran pares del catálogo KROW, ordenados sobre la ruta.
          </Text>
          {stopOptionsLoading ? (
            <Skeleton height={84} style={styles.stopOptionSkeleton} />
          ) : stopOptionsError ? (
            <FeedbackState
              kind="error"
              title="No pudimos cargar las paradas"
              description={stopOptionsError}
            />
          ) : stopPairs.length === 0 ? (
            <FeedbackState
              title="No hay un par válido"
              description="Este viaje ya no tiene paradas compatibles con tu búsqueda."
            />
          ) : (
            stopPairs.map((pair, index) => {
              const selected = index === selectedPairIndex;
              return (
                <TouchableOpacity
                  key={`${pair.pickup.stopId}-${pair.dropoff.stopId}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => onSelectPair(index)}
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
                      Subida: {pair.pickup.name}
                    </Text>
                    <Text
                      style={[
                        styles.stopOptionName,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      Bajada: {pair.dropoff.name}
                    </Text>
                    <Text
                      style={[
                        styles.stopOptionDistance,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      A {pair.pickup.distanceMeters} m del origen ·{' '}
                      {pair.dropoff.distanceMeters} m del destino
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
  searchPanel: {
    borderRadius: 28,
    padding: spacing.md,
  },
  candidateLoading: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.sm,
  },
  candidateSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  candidateTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  candidateEmpty: {
    fontSize: typography.size.sm,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  candidateRow: {
    width: 248,
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  candidateUnavailable: {
    opacity: 0.52,
  },
  candidateCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  candidateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  candidateName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  candidateMeta: {
    fontSize: typography.size.sm,
    marginTop: 3,
  },
  officialBadge: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
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
