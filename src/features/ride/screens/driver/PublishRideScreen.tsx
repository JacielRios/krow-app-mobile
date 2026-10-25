import { KrowAlert as Alert } from '../../../../shared/components/ui-v2/dialogService';
import { IconButton } from '../../../../shared/components/ui-v2';
import { TripFacts, TripRoute } from '../../components/TripPresentation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
  usePreventRemove,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../../core/api/apiClient';
import { money, rideDate } from '../../../../shared/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Config from 'react-native-config';

import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import {
  AmbientBackground,
  Button,
  Card,
  Surface,
  FeedbackState,
  Input,
  Skeleton,
} from '../../../../shared/components/ui-v2';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { glass } from '../../../../shared/theme/materials';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { useCurrentUserRole } from '../../../home/hooks/useCurrentUserRole';
import {
  PlacePicker,
  RoutePreviewMap,
  useDirections,
  type PlacesAutocompleteValue,
} from '../../../maps';
import { rideApi } from '../../api/rideApi';
import { routeApi, type SaveFavoriteRoutePayload } from '../../api/routeApi';
import { RideComfortControls } from '../../components/RideComfortControls';
import { RideDateTimePicker } from '../../components/RideDateTimePicker';
import { invalidateRideLists } from '../../hooks/invalidateRideLists';
import { VehiclePicker } from '../../components/VehiclePicker';
import { RideOriginSummary } from '../../components/RideOriginSummary';
import {
  CAMPUS_ORIGIN,
  maxOfferableSeats,
  selectedCompatibleStops,
} from '../../domain/driverRideRules';
import {
  useDriverVehicles,
  useFavoriteRoutes,
  usePublishRide,
  useRideDetail,
} from '../../hooks';
import type { FavoriteRoute, PublishRidePayload } from '../../types';
import { RecurrencePicker } from '../../components/RecurrencePicker';
import { recurrenceDates, recurrenceWeekday } from '../../domain/recurrence';
import {
  batchPending,
  finishPublicationBatch,
  publishRideBatch,
  readPublicationBatch,
  type PublicationBatch,
} from '../../api/publicationBatch';

type Navigation = NativeStackNavigationProp<MainStackParamList, 'PublishRide'>;
type ScreenRoute = RouteProp<MainStackParamList, 'PublishRide'>;
type Step = 0 | 1 | 2;

const MIN_DEPARTURE_OFFSET_MS = 15 * 60 * 1000;

const endpointValue = (endpoint: {
  address: string;
  lat: number;
  lng: number;
  placeId?: string | null;
}): PlacesAutocompleteValue => ({
  address: endpoint.address,
  placeId: endpoint.placeId ?? '',
  location: { lat: endpoint.lat, lng: endpoint.lng },
});

const formatDistance = (meters: number) =>
  meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
const formatDuration = (seconds: number) =>
  `${Math.max(1, Math.round(seconds / 60))} min`;

export const PublishRideScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const favoriteRouteId = route.params?.favoriteRouteId;
  const editRideId = route.params?.editRideId;
  const favoriteOnly = route.params?.favoriteOnly ?? false;
  const editing = Boolean(editRideId);

  const { user, loading: userLoading } = useCurrentUserRole();
  const {
    vehicles,
    loading: vehiclesLoading,
    error: vehiclesError,
  } = useDriverVehicles();
  const {
    favorites,
    loading: favoritesLoading,
    createFavorite,
    updateFavorite,
    saving,
  } = useFavoriteRoutes();
  const {
    ride,
    loading: rideLoading,
    error: rideError,
    reload: reloadRide,
  } = useRideDetail(editRideId);
  const { publishRide, loading: publishing } = usePublishRide(user?.userId);
  const corridorsQuery = useQuery({
    queryKey: ['route-corridors', user?.userId],
    queryFn: routeApi.corridors,
    enabled: !!user,
  });
  const corridors = corridorsQuery.data ?? [];

  const [step, setStep] = useState<Step>(0);
  const [reviewStopsExpanded, setReviewStopsExpanded] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  const [origin, setOrigin] = useState(CAMPUS_ORIGIN);
  const [destination, setDestination] =
    useState<PlacesAutocompleteValue | null>(null);
  const [corridorId, setCorridorId] = useState('');
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<
    string | undefined
  >(favoriteRouteId);
  const [vehicleId, setVehicleId] = useState('');
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [pendingBatch, setPendingBatch] = useState<PublicationBatch | null>(
    null,
  );
  const [batchError, setBatchError] = useState('');
  const repeated = useMemo(() => {
    if (!repeat || !departureTime)
      return { dates: [] as string[], error: undefined as string | undefined };
    try {
      return {
        dates: recurrenceDates(departureTime, repeatDays, repeatWeeks),
        error: undefined,
      };
    } catch (error) {
      return {
        dates: [] as string[],
        error: error instanceof Error ? error.message : 'Revisa las fechas.',
      };
    }
  }, [repeat, departureTime, repeatDays, repeatWeeks]);
  useEffect(() => {
    let alive = true;
    setPendingBatch(null);
    if (user?.userId && !editing && !favoriteOnly)
      void readPublicationBatch(user.userId)
        .then(batch => {
          if (alive && batch && batchPending(batch)) setPendingBatch(batch);
        })
        .catch(() => {
          if (alive)
            setBatchError(
              'No pudimos recuperar las publicaciones pendientes. Vuelve a abrir esta pantalla.',
            );
        });
    return () => {
      alive = false;
    };
  }, [user?.userId, editing, favoriteOnly]);
  const [availableSeats, setAvailableSeats] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [saveAsFavorite, setSaveAsFavorite] = useState(favoriteOnly);
  const [favoriteName, setFavoriteName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<
        | 'destination'
        | 'corridor'
        | 'coverage'
        | 'vehicle'
        | 'seats'
        | 'price'
        | 'departure'
        | 'name',
        string
      >
    >
  >({});
  const invalid = (
    field: keyof typeof fieldErrors,
    message: string,
    targetStep: Step,
  ) => {
    setFieldErrors({ [field]: message });
    setStep(targetStep);
    scroll.current?.scrollTo({ y: 0, animated: false });
    return false;
  };
  const saved = useRef(false);
  const sending = useRef(false);
  usePreventRemove(dirty || submitting, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (submitting) {
      Alert.alert(
        'Guardando tu viaje',
        'Espera un momento para comprobar el resultado.',
      );
      return;
    }
    Alert.alert(
      '¿Salir sin guardar?',
      'Los cambios de este recorrido se perderán.',
      [
        { text: 'Seguir editando', style: 'cancel' },
        {
          text: 'Descartar cambios',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });
  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setDirty(true);
      setFieldErrors({});
      setter(value);
    };
  const initializedEdit = useRef(false);
  const initializedFavorite = useRef(false);

  const {
    directions,
    loading: routeLoading,
    error: routeError,
    fetch: recalculateRoute,
  } = useDirections(
    origin.location,
    corridorId ? destination?.location ?? null : null,
    {
      autoFetch: true,
      departureTime,
      corridorId: corridorId || undefined,
    },
  );

  const selectedVehicle = vehicles.find(
    vehicle => vehicle.vehicle_id === vehicleId,
  );
  const maxSeats = maxOfferableSeats(selectedVehicle?.capacity ?? 1);
  const selectedStops = useMemo(
    () =>
      selectedCompatibleStops(
        directions?.compatibleStops ?? [],
        selectedStopIds,
      ),
    [directions?.compatibleStops, selectedStopIds],
  );
  const focusedStop = directions?.compatibleStops.find(
    stop => stop.stopId === focusedStopId,
  );
  const selectedCorridor = corridors.find(
    item => item.corridorId === corridorId,
  );
  const firstPublishedDeparture = useMemo(
    () =>
      repeat && repeated.dates[0] ? new Date(repeated.dates[0]) : departureTime,
    [repeat, repeated.dates, departureTime],
  );
  const {
    directions: reviewDirections,
    loading: reviewRouteLoading,
    error: reviewRouteError,
    fetch: retryReviewRoute,
  } = useDirections(
    origin.location,
    step === 2 ? destination?.location ?? null : null,
    {
      departureTime: firstPublishedDeparture,
      corridorId: corridorId || undefined,
      transportStopIds: selectedStops.map(stop => stop.stopId),
    },
  );
  const toggleStop = (stopId: string) => {
    setDirty(true);
    setFieldErrors({});
    setFocusedStopId(stopId);
    setSelectedStopIds(previous =>
      previous.includes(stopId)
        ? previous.filter(id => id !== stopId)
        : [...previous, stopId],
    );
  };

  const applyFavorite = useCallback(
    (favorite: FavoriteRoute) => {
      setSelectedFavoriteId(favorite.routeId);
      // Una plantilla antigua no cambia la salida de un viaje nuevo.
      if (!editRideId) setOrigin(CAMPUS_ORIGIN);
      setDestination(endpointValue(favorite.destination));
      setCorridorId(favorite.corridorId ?? '');
      setVehicleId(favorite.defaults.vehicleId ?? '');
      setAvailableSeats(
        favorite.defaults.availableSeats == null
          ? ''
          : String(favorite.defaults.availableSeats),
      );
      setPricePerSeat(
        favorite.defaults.pricePerSeatCents == null
          ? ''
          : String(favorite.defaults.pricePerSeatCents / 100),
      );
      setSelectedStopIds(
        favorite.stops.filter(stop => stop.active).map(stop => stop.stopId),
      );
      setFavoriteName(favorite.name);
      setSaveAsFavorite(favoriteOnly);
      setStep(0);
    },
    [favoriteOnly, editRideId],
  );

  useEffect(() => {
    if (
      !favoriteRouteId ||
      initializedFavorite.current ||
      favorites.length === 0
    )
      return;
    const favorite = favorites.find(item => item.routeId === favoriteRouteId);
    if (favorite) {
      initializedFavorite.current = true;
      applyFavorite(favorite);
    }
  }, [applyFavorite, favoriteRouteId, favorites]);

  useEffect(() => {
    if (!ride || initializedEdit.current) return;
    initializedEdit.current = true;
    setOrigin(endpointValue(ride.origin));
    setDestination(endpointValue(ride.destination));
    setCorridorId(ride.corridorId ?? '');
    setSelectedFavoriteId(ride.favoriteRouteId ?? undefined);
    setSelectedStopIds(
      ride.stops
        .map(stop => stop.transportStopId)
        .filter((id): id is string => Boolean(id)),
    );
    setVehicleId(ride.vehicle?.vehicle_id ?? '');
    setDepartureTime(new Date(ride.departureTime));
    setAvailableSeats(String(ride.availableSeats));
    setPricePerSeat(String(ride.pricePerSeatCents / 100));
  }, [ride]);

  useEffect(() => {
    if (!directions) return;
    const available = new Set(
      directions.compatibleStops.map(stop => stop.stopId),
    );
    setSelectedStopIds(previous => {
      const valid = previous.filter(id => available.has(id));
      return valid.length === previous.length ? previous : valid;
    });
    setFocusedStopId(null);
  }, [directions]);

  useEffect(() => {
    if (!selectedVehicle || !availableSeats) return;
    if (Number(availableSeats) > maxSeats)
      setAvailableSeats(String(maxSeats || ''));
  }, [availableSeats, maxSeats, selectedVehicle]);

  const selectFavorite = (favorite: FavoriteRoute) => {
    setDirty(true);
    if (favorite.hasStaleStops) {
      Alert.alert(
        'Ruta desactualizada',
        'Algunas paradas ya no están activas. KROW recalculará la ruta y tendrás que elegir paradas vigentes.',
        undefined,
        { type: 'warning' },
      );
    }
    applyFavorite(favorite);
  };

  const validateRoute = () => {
    if (!destination) {
      return invalid('destination', 'Selecciona un lugar para continuar.', 0);
    }
    if (!selectedCorridor) {
      return invalid(
        'corridor',
        'Selecciona la avenida principal de tu viaje.',
        0,
      );
    }
    if (
      origin.location.lat === destination.location.lat &&
      origin.location.lng === destination.location.lng
    ) {
      return invalid(
        'destination',
        'El destino debe ser distinto del origen.',
        0,
      );
    }
    if (!directions) {
      return invalid(
        'coverage',
        routeError ?? 'Espera a que KROW calcule la ruta.',
        0,
      );
    }
    if (selectedStops.length < 1) {
      return invalid(
        'coverage',
        'Selecciona al menos una parada donde podrán bajar tus pasajeros.',
        0,
      );
    }
    return true;
  };

  const validateDetails = () => {
    if (!user?.canPublishRides) {
      Alert.alert(
        'Conductor pendiente',
        'Tu perfil debe estar aprobado antes de publicar viajes.',
        undefined,
        { type: 'warning' },
      );
      return false;
    }
    if (!favoriteOnly && !selectedVehicle) {
      return invalid('vehicle', 'Selecciona un vehículo activo.', 1);
    }
    const seats = Number(availableSeats);
    if (
      (!favoriteOnly || availableSeats !== '') &&
      (!Number.isInteger(seats) ||
        seats < 1 ||
        seats > (favoriteOnly && !selectedVehicle ? 20 : maxSeats))
    ) {
      return invalid(
        'seats',
        `Ingresa entre 1 y ${
          favoriteOnly && !selectedVehicle ? 20 : maxSeats
        } asientos.`,
        1,
      );
    }
    const price = Number(pricePerSeat);
    if (
      (!favoriteOnly || pricePerSeat !== '') &&
      (!Number.isFinite(price) || price <= 0)
    ) {
      return invalid(
        'price',
        'El precio por asiento debe ser mayor que cero.',
        1,
      );
    }
    if (
      !favoriteOnly &&
      (!departureTime ||
        departureTime.getTime() <= Date.now() + MIN_DEPARTURE_OFFSET_MS)
    ) {
      return invalid(
        'departure',
        'La salida debe ser al menos 15 minutos en el futuro.',
        1,
      );
    }
    if ((saveAsFavorite || favoriteOnly) && !favoriteName.trim()) {
      return invalid('name', 'Escribe un nombre para la ruta favorita.', 1);
    }
    if (
      repeat &&
      !editing &&
      !favoriteOnly &&
      (repeated.error || !repeated.dates.length)
    )
      return invalid(
        'departure',
        repeated.error ?? 'Selecciona al menos una salida.',
        1,
      );
    return true;
  };

  const next = () => {
    if (step === 0 && validateRoute()) setStep(1);
    if (step === 1 && validateDetails()) setStep(2);
  };

  const makePayload = (): PublishRidePayload => ({
    vehicle_id: vehicleId,
    corridor_id: corridorId,
    favorite_route_id: selectedFavoriteId,
    origin_lat: origin!.location.lat,
    origin_lng: origin!.location.lng,
    destination_lat: destination!.location.lat,
    destination_lng: destination!.location.lng,
    origin_address: origin!.address,
    destination_address: destination!.address,
    transport_stop_ids: selectedStops.map(stop => stop.stopId),
    departure_time: departureTime!.toISOString(),
    available_seats: Number(availableSeats),
    price_per_seat: Number(pricePerSeat),
  });

  const favoritePayload = (): SaveFavoriteRoutePayload => ({
    name: favoriteName.trim(),
    corridorId,
    origin: {
      address: origin!.address,
      placeId: origin!.placeId || undefined,
      lat: origin!.location.lat,
      lng: origin!.location.lng,
    },
    destination: {
      address: destination!.address,
      placeId: destination!.placeId || undefined,
      lat: destination!.location.lat,
      lng: destination!.location.lng,
    },
    transportStopIds: selectedStops.map(stop => stop.stopId),
    defaultVehicleId: vehicleId || undefined,
    defaultAvailableSeats: Number(availableSeats) || undefined,
    defaultPricePerSeatCents:
      Math.round(Number(pricePerSeat) * 100) || undefined,
  });

  const submit = async () => {
    if (sending.current || saved.current) return;
    if (!validateRoute() || !validateDetails()) return;
    if (!reviewDirections || reviewRouteLoading || reviewRouteError) {
      Alert.alert(
        'Revisa el recorrido',
        reviewRouteError ??
          'Espera a que se calcule la ruta con tus paradas seleccionadas.',
        undefined,
        { type: 'warning' },
      );
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      let effectiveFavoriteId = selectedFavoriteId;
      if (saveAsFavorite || favoriteOnly) {
        if (selectedFavoriteId) {
          await updateFavorite({
            routeId: selectedFavoriteId,
            payload: favoritePayload(),
          });
        } else {
          const result = await createFavorite(favoritePayload());
          effectiveFavoriteId = result.routeId;
          // Reuse this committed template if the following publication fails.
          setSelectedFavoriteId(result.routeId);
        }
      }
      if (favoriteOnly) {
        saved.current = true;
        Alert.alert(
          selectedFavoriteId ? 'Ruta actualizada' : 'Ruta guardada',
          'La ruta frecuente quedó lista para reutilizarse.',
          undefined,
          { type: 'success' },
        );
        navigation.goBack();
        return;
      }
      const payload = {
        ...makePayload(),
        favorite_route_id: effectiveFavoriteId,
      };
      if (editRideId && ride) {
        const result = await rideApi.update(editRideId, ride.version, payload);
        saved.current = true;
        await Promise.allSettled([
          invalidateRideLists(queryClient),
          queryClient.invalidateQueries({
            queryKey: ['ride-detail', editRideId],
          }),
          queryClient.invalidateQueries({
            queryKey: ['ride-context', user?.userId, editRideId],
          }),
        ]);
        Alert.alert(
          'Viaje actualizado',
          `Se guardó la versión ${result.version}.`,
          undefined,
          { type: 'success' },
        );
        navigation.replace('RideScheduled', { rideId: editRideId });
        return;
      }
      if (repeat && user?.userId) {
        const result = await publishRideBatch(
          user.userId,
          { payload, dates: repeated.dates },
          setPendingBatch,
        );
        setPendingBatch(result.batch);
        await invalidateRideLists(queryClient);
        if (result.error)
          throw new Error(
            result.error +
              ' Las salidas confirmadas se conservan; retoma las pendientes.',
          );
        saved.current = true;
        Alert.alert(
          'Publicación terminada',
          `${
            result.batch.entries.filter(e => e.rideId).length
          } viajes publicados. Cada salida se administra por separado.${
            result.batch.entries.some(e => e.skipped)
              ? ' Algunas fechas quedaron fuera del plazo; revisa Mis viajes.'
              : ''
          }`,
          undefined,
          { type: 'success' },
        );
        navigation.replace('DriverTrips');
        return;
      }
      const result = await publishRide(payload);
      if (result.error || !result.rideId)
        throw new Error(result.error ?? 'No se pudo publicar.');
      saved.current = true;
      await invalidateRideLists(queryClient);
      navigation.replace('RideScheduled', { rideId: result.rideId });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'No se pudo guardar el viaje.';
      if (
        editRideId &&
        ((error instanceof ApiError && error.status === 409) ||
          /conflicto|reservas activas/i.test(message))
      ) {
        Alert.alert(
          'El viaje cambió',
          'Otra acción modificó el viaje o llegó una reserva. Puedes conservar tus cambios o cargar la versión actual; al recargar perderás los cambios sin guardar.',
          [
            { text: 'Conservar cambios', style: 'cancel' },
            {
              text: 'Cargar versión actual',
              onPress: () => {
                initializedEdit.current = false;
                void reloadRide().then(result => {
                  if (result.isSuccess) {
                    setDirty(false);
                    setStep(0);
                  }
                });
              },
            },
          ],
        );
      } else {
        Alert.alert(
          editing ? 'No se pudo actualizar' : 'No se pudo publicar',
          message,
          undefined,
          { type: 'error' },
        );
      }
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  if (userLoading || rideLoading) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <Skeleton width="55%" height={28} />
        <Skeleton height={180} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  if (editing && (rideError || !ride)) {
    return (
      <View
        style={[
          styles.blocked,
          {
            paddingTop: insets.top + spacing.lg,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <FeedbackState
          kind="error"
          title="No pudimos cargar el viaje"
          description={rideError ?? 'El viaje ya no está disponible.'}
          actionLabel="Reintentar"
          onAction={() => void reloadRide()}
        />
        <Button
          title="Volver"
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (user?.role === 'conductor' && !user.canPublishRides) {
    return (
      <View
        style={[
          styles.blocked,
          {
            paddingTop: insets.top + spacing.lg,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <FeedbackState
          title="Tu perfil aún no está aprobado"
          description="Podrás publicar viajes cuando administración apruebe tu perfil de conductor."
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (editing && ride && !ride.canEdit) {
    return (
      <View
        style={[
          styles.blocked,
          {
            paddingTop: insets.top + spacing.lg,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <FeedbackState
          title="Este viaje no se puede editar"
          description={
            ride.editBlockReason ?? 'Solo puedes cancelar este viaje.'
          }
          actionLabel="Volver"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AmbientBackground />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <IconButton
            accessibilityLabel="Volver"
            onPress={() =>
              step === 0 ? navigation.goBack() : setStep((step - 1) as Step)
            }
            style={styles.back}
            iconName="arrow-back"
            variant="plain"
            color={theme.colors.textPrimary}
          />
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {favoriteOnly
                ? selectedFavoriteId
                  ? 'Editar ruta frecuente'
                  : 'Nueva ruta frecuente'
                : editing
                ? 'Editar viaje'
                : 'Publicar viaje'}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {
                [
                  'Elige destino, avenida y paradas de descenso',
                  favoriteOnly
                    ? 'Agrega preferencias opcionales'
                    : 'Configura horario, vehículo y cupo',
                  'Confirma antes de guardar',
                ][step]
              }
            </Text>
          </View>
        </View>

        <StepIndicator step={step} />

        {!editing && !favoriteOnly && (
          <View style={{ gap: 12 }}>
            {!!batchError && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: theme.colors.status.error }}
              >
                {batchError}
              </Text>
            )}
            {pendingBatch && batchPending(pendingBatch) && (
              <Card>
                <View style={{ gap: 12 }}>
                  <Text style={{ color: theme.colors.textPrimary }}>
                    Publicación pendiente:{' '}
                    {pendingBatch.entries.filter(e => e.rideId).length} de{' '}
                    {pendingBatch.entries.length} confirmadas
                  </Text>
                  <Button
                    title="Retomar publicaciones pendientes"
                    disabled={submitting}
                    onPress={() => {
                      if (sending.current || !user?.userId) return;
                      sending.current = true;
                      setSubmitting(true);
                      setBatchError('');
                      void publishRideBatch(
                        user.userId,
                        undefined,
                        setPendingBatch,
                      )
                        .then(async result => {
                          setPendingBatch(result.batch);
                          await invalidateRideLists(queryClient);
                          if (result.error) setBatchError(result.error);
                          else {
                            saved.current = true;
                            navigation.replace('DriverTrips');
                          }
                        })
                        .catch(error =>
                          setBatchError(
                            error instanceof Error
                              ? error.message
                              : 'No pudimos retomar el intento.',
                          ),
                        )
                        .finally(() => {
                          sending.current = false;
                          setSubmitting(false);
                        });
                    }}
                  />
                  <Button
                    title="Finalizar intento pendiente"
                    variant="text"
                    disabled={submitting}
                    onPress={() =>
                      Alert.alert(
                        'Finalizar publicaciones pendientes',
                        'Se conservarán los viajes ya creados. Las fechas restantes no se publicarán; si una respuesta se perdió, revisa Mis viajes antes de volver a publicar.',
                        [
                          { text: 'Volver', style: 'cancel' },
                          {
                            text: 'Finalizar intento',
                            onPress: () => {
                              if (user?.userId)
                                void finishPublicationBatch(user.userId)
                                  .then(() => {
                                    setPendingBatch(null);
                                    setBatchError('');
                                  })
                                  .catch(() =>
                                    setBatchError(
                                      'No pudimos finalizar el intento.',
                                    ),
                                  );
                            },
                          },
                        ],
                      )
                    }
                  />
                </View>
              </Card>
            )}
          </View>
        )}

        {step === 0 && (
          <>
            {favorites.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Ruta frecuente
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {favorites.map(favorite => (
                    <Pressable
                      key={favorite.routeId}
                      onPress={() => selectFavorite(favorite)}
                      style={({ pressed }) => [
                        [
                          styles.favoriteChip,
                          {
                            backgroundColor:
                              selectedFavoriteId === favorite.routeId
                                ? theme.colors.primarySoft
                                : theme.colors.surfaceRaised,
                            borderColor:
                              selectedFavoriteId === favorite.routeId
                                ? theme.colors.primary
                                : theme.colors.border,
                          },
                        ],
                        { opacity: pressed ? 0.72 : 1 },
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={favorite.name}
                      accessibilityState={{
                        checked: selectedFavoriteId === favorite.routeId,
                      }}
                    >
                      <MaterialIcons
                        name={
                          favorite.hasStaleStops ? 'warning-amber' : 'route'
                        }
                        size={18}
                        color={
                          favorite.hasStaleStops
                            ? theme.colors.status.warning
                            : theme.colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.favoriteChipText,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {favorite.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {favoritesLoading && (
              <Skeleton height={44} style={{ marginBottom: spacing.md }} />
            )}

            <Surface
              radius={20}
              contentStyle={{
                padding: 16,
                backgroundColor: theme.colors.surface,
              }}
            >
              <RideOriginSummary origin={origin} compact />
              <PlacePicker
                compact
                label="Destino"
                error={fieldErrors.destination}
                value={destination}
                onChange={value => {
                  setDirty(true);
                  setFieldErrors({});
                  setDestination(value);
                  if (!favoriteOnly) setSelectedFavoriteId(undefined);
                  setSelectedStopIds([]);
                }}
                bias={origin?.location}
              />
            </Surface>
            {(!destination || !corridorId) && (
              <View style={{ marginTop: 16, marginBottom: 20, gap: 8 }}>
                <RoutePreviewMap
                  origin={origin?.location ?? null}
                  destination={destination?.location ?? null}
                  interactive
                  height={250}
                />
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {destination
                    ? 'Elige una avenida para calcular el recorrido y sus paradas.'
                    : 'Este es tu punto de salida. Elige un destino para trazar el recorrido.'}
                </Text>
              </View>
            )}
            {destination && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Avenida principal
                </Text>
                <Text
                  style={[
                    styles.corridorHelp,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  La ruta se calculará por la avenida que elijas.
                </Text>
                {corridorsQuery.isLoading ? (
                  <Skeleton height={52} />
                ) : corridorsQuery.isError && !corridors.length ? (
                  <FeedbackState
                    kind="error"
                    title="No pudimos cargar las avenidas"
                    description={
                      corridorsQuery.error instanceof Error
                        ? corridorsQuery.error.message
                        : 'Revisa tu conexión.'
                    }
                    actionLabel="Reintentar"
                    onAction={() => void corridorsQuery.refetch()}
                  />
                ) : corridors.length === 0 ? (
                  <FeedbackState
                    title="Catálogo en preparación"
                    description="No hay avenidas activas disponibles para publicar en el piloto."
                    actionLabel="Actualizar"
                    onAction={() => void corridorsQuery.refetch()}
                  />
                ) : (
                  corridors.map(corridor => (
                    <Pressable
                      key={corridor.corridorId}
                      accessibilityRole="radio"
                      accessibilityLabel={`Avenida: ${corridor.name}`}
                      accessibilityState={{
                        checked: corridorId === corridor.corridorId,
                      }}
                      onPress={() => {
                        if (corridorId === corridor.corridorId) return;
                        setDirty(true);
                        setFieldErrors({});
                        setCorridorId(corridor.corridorId);
                        setSelectedStopIds([]);
                        setFocusedStopId(null);
                        if (!favoriteOnly) setSelectedFavoriteId(undefined);
                      }}
                      style={({ pressed }) => [
                        styles.corridorOption,
                        { opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          corridorId === corridor.corridorId
                            ? 'radio-button-checked'
                            : 'radio-button-unchecked'
                        }
                        size={24}
                        color={
                          corridorId === corridor.corridorId
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.checkText,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {corridor.name}
                      </Text>
                    </Pressable>
                  ))
                )}
                {!!fieldErrors.corridor && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{ color: theme.colors.status.error }}
                  >
                    {fieldErrors.corridor}
                  </Text>
                )}
              </View>
            )}
            {!!fieldErrors.coverage && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: theme.colors.status.error }}
              >
                {fieldErrors.coverage}
              </Text>
            )}

            {origin && destination && corridorId && (
              <>
                <RoutePreviewMap
                  origin={origin.location}
                  destination={destination.location}
                  encodedPolyline={directions?.encodedPolyline}
                  interactive
                  extraMarkers={(directions?.compatibleStops ?? []).map(
                    (stop, index) => ({
                      id: stop.stopId,
                      point: stop.location,
                      selected: selectedStopIds.includes(stop.stopId),
                      onPress: () => toggleStop(stop.stopId),
                      iconName: 'directions-bus',
                      label: String(index + 1),
                      accessibilityLabel: `Parada ${index + 1}: ${stop.name}. ${
                        selectedStopIds.includes(stop.stopId)
                          ? 'Seleccionada'
                          : 'Disponible'
                      }. Toca para cambiar`,
                    }),
                  )}
                />
                <View style={styles.routeMeta}>
                  {routeLoading ? (
                    <Text style={{ color: theme.colors.textSecondary }}>
                      Calculando ruta y paradas…
                    </Text>
                  ) : directions ? (
                    <>
                      <Text style={{ color: theme.colors.textSecondary }}>
                        {formatDistance(directions.distanceMeters)} ·{' '}
                        {formatDuration(directions.durationSeconds)}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary }}>
                        {selectedStops.length} paradas seleccionadas
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: theme.colors.status.error }}>
                      {routeError}
                    </Text>
                  )}
                </View>
              </>
            )}

            {!!routeError && corridorId && (
              <FeedbackState
                kind="error"
                title="No pudimos calcular el recorrido"
                description={routeError}
                actionLabel="Reintentar ruta"
                onAction={() => void recalculateRoute()}
              />
            )}

            {directions && directions.compatibleStops.length === 0 ? (
              <FeedbackState
                title="No hay paradas compatibles"
                description="No hay paradas de esa avenida convenientes antes de tu destino. Elige otra avenida o destino."
              />
            ) : (
              <View style={styles.stopList}>
                <Text
                  style={{ color: theme.colors.textSecondary }}
                  accessibilityLiveRegion="polite"
                >
                  {focusedStop
                    ? `${focusedStop.name} · ${
                        focusedStop.address ?? 'Parada disponible'
                      }`
                    : directions
                    ? 'Elige las paradas donde podrán bajar tus pasajeros. Toca el mapa o marca la lista.'
                    : ''}
                </Text>
                {(directions?.compatibleStops ?? []).map((stop, index) => {
                  const selected = selectedStopIds.includes(stop.stopId);
                  return (
                    <Pressable
                      key={stop.stopId}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Parada ${index + 1}: ${stop.name}. ${
                        selected ? 'Seleccionada' : 'Disponible'
                      }`}
                      accessibilityState={{
                        checked: selected,
                      }}
                      onPress={() => toggleStop(stop.stopId)}
                    >
                      <Card
                        variant="flat"
                        padding="sm"
                        style={[
                          styles.stopCard,
                          {
                            borderWidth: 1,
                            borderRadius: radii.md,
                            borderColor: selected
                              ? theme.colors.primary
                              : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.primarySoft
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <View style={styles.stopRow}>
                          <MaterialIcons
                            name={
                              selected ? 'check-box' : 'check-box-outline-blank'
                            }
                            size={22}
                            color={theme.colors.primary}
                          />
                          <View style={styles.stopCopy}>
                            <Text
                              style={[
                                styles.stopName,
                                { color: theme.colors.textPrimary },
                              ]}
                            >
                              {index + 1}. {stop.name}
                            </Text>
                            <Text
                              style={[
                                styles.stopAddress,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {stop.address ??
                                stop.municipality ??
                                'Parada KROW'}{' '}
                              {selected ? '· Disponible para pasajeros' : ''}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {step === 1 && (
          <>
            {vehiclesError ? (
              <FeedbackState
                kind="error"
                title="No pudimos cargar tus vehículos"
                description={vehiclesError}
              />
            ) : null}
            {!favoriteOnly && !vehiclesLoading && vehicles.length === 0 ? (
              <FeedbackState
                title="Necesitas un vehículo activo"
                description="Registra y activa un vehículo antes de publicar viajes."
              />
            ) : (
              <>
                {!favoriteOnly && (
                  <RideDateTimePicker
                    label={
                      repeat
                        ? 'Fecha inicial y hora de las salidas'
                        : 'Fecha y hora de salida'
                    }
                    value={departureTime}
                    onChange={change(setDepartureTime)}
                    minimumDate={new Date()}
                  />
                )}
                {!editing && !favoriteOnly && (
                  <RecurrencePicker
                    enabled={repeat}
                    weekdays={repeatDays}
                    weeks={repeatWeeks}
                    onToggle={() => {
                      setDirty(true);
                      setRepeat(!repeat);
                      if (!repeatDays.length && departureTime)
                        setRepeatDays([recurrenceWeekday(departureTime)]);
                    }}
                    onDays={change(setRepeatDays)}
                    onWeeks={change(setRepeatWeeks)}
                    dates={repeated.dates}
                    error={repeated.error}
                  />
                )}
                {!!fieldErrors.departure && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{ color: theme.colors.status.error }}
                  >
                    {fieldErrors.departure}
                  </Text>
                )}
                <VehiclePicker
                  label={
                    favoriteOnly
                      ? 'Vehículo predeterminado (opcional)'
                      : 'Vehículo'
                  }
                  vehicles={vehicles}
                  selectedId={vehicleId}
                  onSelect={id => {
                    setDirty(true);
                    setFieldErrors({});
                    setVehicleId(id);
                    const capacity = maxOfferableSeats(
                      vehicles.find(vehicle => vehicle.vehicle_id === id)
                        ?.capacity ?? 1,
                    );
                    if (Number(availableSeats) > capacity)
                      setAvailableSeats(capacity > 0 ? String(capacity) : '');
                  }}
                  loading={vehiclesLoading}
                />
                {!!fieldErrors.vehicle && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{ color: theme.colors.status.error }}
                  >
                    {fieldErrors.vehicle}
                  </Text>
                )}
                <RideComfortControls
                  seats={availableSeats}
                  onSeatsChange={change(setAvailableSeats)}
                  maxSeats={maxSeats}
                  price={pricePerSeat}
                  onPriceChange={change(setPricePerSeat)}
                  optional={favoriteOnly}
                  seatsError={fieldErrors.seats}
                  priceError={fieldErrors.price}
                />
                {!favoriteOnly && (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: saveAsFavorite }}
                    onPress={() => {
                      setDirty(true);
                      setSaveAsFavorite(value => !value);
                    }}
                    style={({ pressed }) => [
                      styles.checkRow,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        saveAsFavorite ? 'check-box' : 'check-box-outline-blank'
                      }
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {selectedFavoriteId
                        ? 'Actualizar también esta ruta frecuente'
                        : 'Guardar esta configuración como ruta frecuente'}
                    </Text>
                  </Pressable>
                )}
                {(saveAsFavorite || favoriteOnly) && (
                  <Input
                    label="Nombre de la ruta"
                    error={fieldErrors.name}
                    value={favoriteName}
                    onChangeText={change(setFavoriteName)}
                    maxLength={80}
                    placeholder="ITNL → Casa"
                  />
                )}
              </>
            )}
          </>
        )}

        {step === 2 && origin && destination && directions && (
          <>
            {reviewRouteLoading && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: theme.colors.textSecondary }}
              >
                Calculando el recorrido con tus paradas…
              </Text>
            )}
            {!!reviewRouteError && (
              <FeedbackState
                kind="error"
                title="Revisa la ruta antes de guardar"
                description={reviewRouteError}
                actionLabel="Reintentar"
                onAction={() => void retryReviewRoute()}
              />
            )}
            <Surface
              radius={20}
              contentStyle={{
                padding: 16,
                gap: 16,
                backgroundColor: theme.colors.surface,
              }}
            >
              <TripRoute
                origin={origin.address}
                destination={destination.address}
                compact
              />
              {repeat && !editing && !favoriteOnly && (
                <RecurrencePicker
                  enabled
                  weekdays={repeatDays}
                  weeks={repeatWeeks}
                  onToggle={() => undefined}
                  onDays={() => undefined}
                  onWeeks={() => undefined}
                  dates={repeated.dates}
                  error={repeated.error}
                  previewOnly
                />
              )}
              <View
                style={{
                  borderTopWidth: 0.5,
                  borderColor: theme.colors.border,
                  paddingTop: 16,
                }}
              >
                <TripFacts
                  items={[
                    ...(!favoriteOnly && departureTime
                      ? [
                          {
                            icon: 'schedule',
                            label: repeat ? 'Primera salida' : 'Salida',
                            value: rideDate(
                              (
                                firstPublishedDeparture ?? departureTime
                              ).toISOString(),
                            ),
                          },
                        ]
                      : []),
                    ...(availableSeats !== ''
                      ? [
                          {
                            icon: 'event-seat',
                            label: 'Cupo',
                            value: `${availableSeats} asientos`,
                          },
                        ]
                      : []),
                    ...(pricePerSeat !== ''
                      ? [
                          {
                            icon: 'payments',
                            label: 'Por asiento',
                            value: money(
                              Math.round(Number(pricePerSeat) * 100),
                            ),
                            detail:
                              !favoriteOnly &&
                              Config.KROW_PILOT_ENABLED === 'true'
                                ? 'Pago en efectivo de cada pasajero'
                                : 'Importe por cada asiento reservado',
                          },
                        ]
                      : []),
                    {
                      icon: 'straighten',
                      label: 'Recorrido',
                      value: `${formatDistance(
                        reviewDirections?.distanceMeters ??
                          directions.distanceMeters,
                      )} · ${formatDuration(
                        reviewDirections?.durationSeconds ??
                          directions.durationSeconds,
                      )}`,
                    },
                  ]}
                />
              </View>
            </Surface>
            <View style={{ marginVertical: 20 }}>
              <RoutePreviewMap
                height={190}
                origin={origin.location}
                destination={destination.location}
                encodedPolyline={reviewDirections?.encodedPolyline}
                extraMarkers={selectedStops.map((stop, index) => ({
                  id: stop.stopId,
                  point: stop.location,
                  selected: false,
                  label: String(index + 1),
                  accessibilityLabel: `Parada ${index + 1}: ${stop.name}`,
                }))}
              />
            </View>
            <TripFacts
              items={[
                {
                  icon: 'alt-route',
                  label: 'Avenida',
                  value: selectedCorridor?.name ?? 'Sin elegir',
                },
                ...(selectedVehicle
                  ? [
                      {
                        icon: 'directions-car',
                        label: favoriteOnly
                          ? 'Vehículo predeterminado'
                          : 'Vehículo',
                        value: `${selectedVehicle.brand} ${selectedVehicle.model}`,
                        detail: selectedVehicle.license_plate,
                      },
                    ]
                  : []),
              ]}
            />
            <View style={{ marginTop: 24, gap: 8 }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: 18,
                  fontWeight: '600',
                }}
              >
                Paradas de descenso · {selectedStops.length}
              </Text>
              {(reviewStopsExpanded
                ? selectedStops
                : selectedStops.slice(0, 2)
              ).map((stop, index) => (
                <View
                  key={stop.stopId}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    paddingVertical: 12,
                    borderBottomWidth: 0.5,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: theme.colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.primary, fontWeight: '600' }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                    >
                      {stop.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {stop.address ?? stop.municipality ?? 'Parada Krow'}
                    </Text>
                  </View>
                </View>
              ))}
              {selectedStops.length > 2 && (
                <Button
                  title={
                    reviewStopsExpanded
                      ? 'Mostrar menos paradas'
                      : `Ver las ${selectedStops.length} paradas`
                  }
                  variant="text"
                  onPress={() => setReviewStopsExpanded(value => !value)}
                  accessibilityState={{ expanded: reviewStopsExpanded }}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
      <View
        style={[
          styles.actions,
          glass(theme),
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        {step > 0 && (
          <IconButton
            variant="tonal"
            onPress={() => setStep((step - 1) as Step)}
            iconName="arrow-back"
            accessibilityLabel="Volver al paso anterior"
          />
        )}
        {step < 2 ? (
          <Button
            title="Continuar"
            fullWidth={false}
            style={styles.nextAction}
            onPress={next}
            disabled={
              routeLoading ||
              (!favoriteOnly && step === 1 && vehicles.length === 0)
            }
            iconName="arrow-forward"
          />
        ) : (
          <Button
            fullWidth={false}
            style={styles.nextAction}
            title={
              favoriteOnly
                ? 'Guardar ruta frecuente'
                : editing
                ? 'Guardar cambios'
                : repeat
                ? `Publicar ${repeated.dates.length} viajes`
                : 'Publicar viaje'
            }
            onPress={submit}
            disabled={
              reviewRouteLoading || !reviewDirections || !!reviewRouteError
            }
            loading={submitting || publishing || saving}
            iconName={
              favoriteOnly ? 'bookmark-border' : editing ? 'check' : 'add-road'
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const StepIndicator: React.FC<{ step: Step }> = ({ step }) => {
  const { theme } = useTheme();
  return (
    <View
      style={{ marginBottom: 20, gap: 8 }}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: 3,
        now: step + 1,
        text: ['Ruta', 'Detalles', 'Revisión'][step],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
          Paso {step + 1} de 3
        </Text>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {['Ruta', 'Detalles', 'Revisión'][step]}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2].map(index => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor:
                index <= step ? theme.colors.primary : theme.colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  blocked: { flex: 1, paddingHorizontal: spacing.lg },
  container: { paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: typography.size.xxl, fontWeight: typography.weight.bold },
  subtitle: { fontSize: typography.size.sm, lineHeight: 18, marginTop: 2 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontWeight: typography.weight.bold },
  stepLabel: { fontSize: typography.size.sm, marginTop: spacing.xs },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.sm,
  },
  corridorHelp: { fontSize: typography.size.sm, marginBottom: spacing.sm },
  corridorOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginRight: spacing.sm,
  },
  favoriteChipText: {
    marginLeft: spacing.sm,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
  routeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  stopList: { marginBottom: spacing.md },
  stopCard: { padding: 12, marginBottom: spacing.sm },
  stopRow: { flexDirection: 'row', alignItems: 'center' },
  stopCopy: { flex: 1, marginLeft: spacing.sm },
  stopName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  stopAddress: { fontSize: typography.size.sm, marginTop: 2 },
  checkRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkText: { flex: 1, marginLeft: spacing.sm, fontSize: typography.size.md },
  reviewCard: { marginTop: spacing.md },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  reviewCopy: { flex: 1, marginLeft: spacing.sm },
  reviewLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: { fontSize: typography.size.md, lineHeight: 20, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  nextAction: { flex: 1 },
});
