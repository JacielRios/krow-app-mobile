import {
  AmbientBackground,
  Surface,
} from '../../../../shared/components/ui-v2';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TurboModuleRegistry,
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
import { PlacePicker, RoutePreviewMap, useReverseGeocode } from '../../../maps';
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

const EMPTY_CANDIDATES: PassengerStopCandidates = {
  radiusMeters: 1000,
  pickupStops: [],
  dropoffStops: [],
  pairs: [],
};

type GeolocationModule =
  typeof import('@react-native-community/geolocation')['default'];

const loadGeolocation = (): GeolocationModule | null => {
  const nativeModule =
    TurboModuleRegistry.get('RNCGeolocation') ?? NativeModules.RNCGeolocation;
  if (!nativeModule) return null;
  try {
    return require('@react-native-community/geolocation')
      .default as GeolocationModule;
  } catch {
    return null;
  }
};

const requestLocationPermission = async (
  geolocation: GeolocationModule,
): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return new Promise<boolean>(resolve => {
      geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false),
      );
    });
  }
  if (Platform.OS !== 'android' || Number(Platform.Version) < 23) return true;
  const status = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Usar tu ubicación',
      message:
        'KROW usa tu ubicación para encontrar paradas de subida cercanas.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Ahora no',
    },
  );
  return status === PermissionsAndroid.RESULTS.GRANTED;
};

export const RequestRideScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<RequestRideNav>();
  const insets = useSafeAreaInsets();

  const {
    rides,
    loading: searchLoading,
    error: searchError,
    search,
    reset,
  } = useSearchRides();
  const { requestBooking, loading: requesting } = useRequestBooking();
  const { resolve: reverseGeocode } = useReverseGeocode();

  const [requestedRideIds, setRequestedRideIds] = useState<Set<string>>(
    new Set(),
  );
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<AvailableRide | null>(null);
  const [requestingRideId, setRequestingRideId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [origin, setOrigin] = useState<PlacesAutocompleteValue | null>(null);
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
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationMessage, setLocationMessage] = useState(
    'Obteniendo tu ubicación actual…',
  );
  const requestedLocation = useRef(false);

  const locateCurrentPosition = useCallback(async () => {
    setLocationLoading(true);
    setLocationMessage('Obteniendo tu ubicación actual…');
    try {
      const geolocation = loadGeolocation();
      if (!geolocation) {
        setLocationMessage(
          'Actualiza la aplicación para usar el GPS. Mientras tanto, puedes escribir tu origen.',
        );
        return;
      }
      const allowed = await requestLocationPermission(geolocation);
      if (!allowed) {
        setLocationMessage(
          'Permiso de ubicación no concedido. Puedes elegir tu origen en el mapa.',
        );
        return;
      }
      const position = await new Promise<{
        coords: { latitude: number; longitude: number };
      }>((resolvePosition, rejectPosition) => {
        geolocation.getCurrentPosition(resolvePosition, rejectPosition, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });
      });
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      const address = await reverseGeocode(point);
      setOrigin({
        address: address ?? 'Mi ubicación actual',
        placeId: '',
        location: point,
      });
      setLocationMessage('Ubicación actual detectada');
    } catch {
      setLocationMessage(
        'No pudimos obtener tu ubicación. Puedes elegir tu origen en el mapa.',
      );
    } finally {
      setLocationLoading(false);
    }
  }, [reverseGeocode]);

  useEffect(() => {
    if (requestedLocation.current) return;
    requestedLocation.current = true;
    locateCurrentPosition().catch(() => undefined);
  }, [locateCurrentPosition]);

  useEffect(() => {
    let active = true;
    if (!origin || !destination) {
      setStopCandidates(EMPTY_CANDIDATES);
      setSelectedPickupId(null);
      setSelectedDropoffId(null);
      setStopCandidatesError(null);
      return;
    }
    setStopCandidatesLoading(true);
    setStopCandidatesError(null);
    rideApi
      .stopCandidates(origin.location, destination.location)
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
  }, [destination, origin]);

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

  const loadAll = useCallback(
    async (forceSearch = false) => {
      try {
        const searchPromise =
          origin && destination && (hasSearched || forceSearch)
            ? search({
                maxResults: 50,
                origin: origin.location,
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
    ],
  );

  const handleSearch = () => {
    if (!origin || !destination) {
      Alert.alert(
        'Ruta incompleta',
        'Selecciona un origen y un destino para buscar coincidencias.',
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
      setRefreshing(false);
    }
  };

  const handleRequest = async (
    ride: AvailableRide,
    pair: StopPair | undefined,
  ) => {
    if (requestedRideIds.has(ride.rideId)) return;
    if (!pair) {
      Alert.alert(
        'Selecciona tus paradas',
        'Elige un par válido de subida y bajada antes de solicitar.',
      );
      return;
    }

    setRequestingRideId(ride.rideId);
    const { bookingId, error } = await requestBooking({
      ride_id: ride.rideId,
      seats_reserved: 1,
      pickup_stop_id: pair.pickup.stopId,
      dropoff_stop_id: pair.dropoff.stopId,
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

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <ScrollView
        style={{ flex: 1 }}
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
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Viajes disponibles
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Tu recorrido, a tu manera. Elige tus puntos en el mapa.
            </Text>
          </View>
        </View>

        {origin && destination && (
          <View style={{ marginBottom: -24 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <Button
                title="Elegir subida"
                variant={mapRole === 'pickup' ? 'primary' : 'outline'}
                fullWidth={false}
                size="sm"
                onPress={() => setMapRole('pickup')}
                accessibilityState={{ selected: mapRole === 'pickup' }}
              />
              <Button
                title="Elegir bajada"
                variant={mapRole === 'dropoff' ? 'primary' : 'outline'}
                fullWidth={false}
                size="sm"
                onPress={() => setMapRole('dropoff')}
                accessibilityState={{ selected: mapRole === 'dropoff' }}
              />
            </View>
            <RoutePreviewMap
              origin={origin.location}
              destination={destination.location}
              interactive
              height={320}
              extraMarkers={mapStops.map(stop => ({
                id: `candidate-${stop.stopId}`,
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
                selected:
                  stop.stopId === selectedPickupId ||
                  stop.stopId === selectedDropoffId,
                accessibilityLabel: `${stop.name}. ${
                  stop.enabled ? 'Disponible' : 'Sin rutas disponibles'
                }`,
              }))}
            />
          </View>
        )}
        <Surface
          radius={28}
          style={{ marginBottom: spacing.lg }}
          contentStyle={[styles.searchPanel, { paddingTop: 24 }]}
        >
          <PlacePicker
            label="¿Desde dónde sales?"
            value={origin}
            onChange={value => {
              setOrigin(value);
              setSelectedRide(null);
              setHasSearched(false);
              setLocationMessage('Punto de salida seleccionado');
              reset();
            }}
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => locateCurrentPosition().catch(() => undefined)}
            style={styles.locationStatus}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialIcons
                name="my-location"
                size={18}
                color={theme.colors.primary}
              />
            )}
            <Text
              style={[
                styles.locationStatusText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {locationMessage}
            </Text>
          </TouchableOpacity>
          <PlacePicker
            label="¿A dónde vas?"
            value={destination}
            onChange={value => {
              setDestination(value);
              setSelectedRide(null);
              setHasSearched(false);
              reset();
            }}
            bias={origin?.location}
          />

          {origin && destination ? (
            <>
              {stopCandidatesLoading ? (
                <View style={styles.candidateLoading}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.textSecondary }}>
                    Buscando paradas a menos de 1 km…
                  </Text>
                </View>
              ) : stopCandidatesError ? (
                <FeedbackState
                  kind="error"
                  title="No pudimos cargar las paradas"
                  description={stopCandidatesError}
                />
              ) : (
                <>
                  <StopCandidateList
                    title="¿Dónde subes?"
                    stops={stopCandidates.pickupStops}
                    selectedId={selectedPickupId}
                    onSelect={selectPickup}
                  />
                  <StopCandidateList
                    title="¿Dónde bajas?"
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
                </>
              )}
            </>
          ) : null}

          <Button
            title="Buscar viajes compatibles"
            onPress={handleSearch}
            loading={searchLoading}
            disabled={
              stopCandidatesLoading || !selectedPickupId || !selectedDropoffId
            }
          />
        </Surface>

        {isInitialLoading ? (
          <View style={styles.centered} accessibilityLabel="Cargando viajes">
            <Skeleton height={112} />
            <Skeleton height={112} style={{ marginTop: spacing.md }} />
          </View>
        ) : searchError ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar los viajes"
            description={searchError}
            actionLabel="Reintentar"
            onAction={loadAll}
          />
        ) : !hasSearched ? (
          <FeedbackState
            title="Indica tu recorrido"
            description="KROW mostrará las paradas a menos de 1 km y habilitará las que tengan rutas disponibles."
          />
        ) : sortedRides.length === 0 ? (
          <FeedbackState
            title="No encontramos viajes compatibles"
            description="No hay un viaje con paradas válidas cerca de ambos puntos. Prueba con ubicaciones cercanas."
          />
        ) : (
          sortedRides.map(ride => (
            <RideCard
              key={ride.rideId}
              ride={ride}
              alreadyRequested={requestedRideIds.has(ride.rideId)}
              requesting={requestingRideId === ride.rideId}
              onPress={() => setSelectedRide(ride)}
              onRequest={() => setSelectedRide(ride)}
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
        stopPairs={stopPairs}
        selectedPairIndex={selectedPairIndex}
        onSelectPair={setSelectedPairIndex}
        stopOptionsLoading={stopOptionsLoading}
        stopOptionsError={stopOptionsError}
        onClose={() => setSelectedRide(null)}
        onRequest={() =>
          selectedRide &&
          handleRequest(selectedRide, stopPairs[selectedPairIndex])
        }
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
          No hay paradas del catálogo dentro de 1 km.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
        >
          {stops.map(stop => {
            const unavailable =
              !stop.enabled ||
              stop.stopId === excludedId ||
              (allowedIds != null && !allowedIds.has(stop.stopId));
            const selected = stop.stopId === selectedId;
            return (
              <TouchableOpacity
                key={`${stop.role}-${stop.stopId}`}
                accessibilityRole="radio"
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
                      {stop.name}
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
              stopPairs.length === 0
            }
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
  locationStatus: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  locationStatusText: {
    flex: 1,
    fontSize: typography.size.sm,
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
