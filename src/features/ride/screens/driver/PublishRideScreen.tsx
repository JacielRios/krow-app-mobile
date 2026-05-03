import React, { useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../../shared/theme/colors';
import { spacing, typography } from '../../../../shared/theme/tokens';
import { Button } from '../../../../shared/components/ui/Button';
import { RideForm } from '../../components';
import type { RideFormErrors, RideFormValues } from '../../components';
import { useDriverVehicles, usePublishRide } from '../../hooks';
import { useDirections } from '../../../maps';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type PublishRideNav = NativeStackNavigationProp<
  MainStackParamList,
  'PublishRide'
>;

const INITIAL_FORM: RideFormValues = {
  origin: null,
  destination: null,
  available_seats: '',
  price_per_seat: '',
  vehicle_id: '',
  departure_time: null,
};

const MIN_DEPARTURE_OFFSET_MS = 15 * 60 * 1000; // 15 min
const MAX_AVAILABLE_SEATS = 3;
const MIN_AVAILABLE_SEATS = 1;

function validateForm(
  values: RideFormValues,
  hasPolyline: boolean,
): RideFormErrors {
  const errors: RideFormErrors = {};
  const seats = parseInt(values.available_seats, 10);
  const price = parseFloat(values.price_per_seat);

  if (!values.origin) {
    errors.origin = 'Selecciona un origen del listado';
  }
  if (!values.destination) {
    errors.destination = 'Selecciona un destino del listado';
  }
  if (
    values.origin &&
    values.destination &&
    values.origin.placeId === values.destination.placeId
  ) {
    errors.destination = 'El destino debe ser distinto del origen';
  }
  if (values.origin && values.destination && !hasPolyline) {
    errors.route =
      'No pudimos calcular la ruta entre origen y destino. Intenta de nuevo.';
  }
  if (!values.departure_time) {
    errors.departure_time = 'Selecciona la fecha y hora de salida';
  } else if (
    values.departure_time.getTime() <= Date.now() + MIN_DEPARTURE_OFFSET_MS
  ) {
    errors.departure_time =
      'La hora de salida debe ser al menos 15 minutos en el futuro';
  }
  if (
    !values.available_seats ||
    isNaN(seats) ||
    seats < MIN_AVAILABLE_SEATS ||
    seats > MAX_AVAILABLE_SEATS
  ) {
    errors.available_seats = `Los asientos deben ser entre ${MIN_AVAILABLE_SEATS} y ${MAX_AVAILABLE_SEATS}`;
  }
  if (!values.price_per_seat || isNaN(price) || price <= 0) {
    errors.price_per_seat = 'El precio debe ser mayor a $0 MXN';
  }
  if (!values.vehicle_id) {
    errors.vehicle_id = 'Selecciona un vehículo';
  }
  return errors;
}

function hasErrors(errors: RideFormErrors): boolean {
  return Object.values(errors).some(v => v !== undefined);
}

export const PublishRideScreen: React.FC = () => {
  const navigation = useNavigation<PublishRideNav>();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<RideFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<RideFormErrors>({});

  const { vehicles, loading: vehiclesLoading, error: vehiclesError, reload } =
    useDriverVehicles();
  const { publishRide, loading: publishing } = usePublishRide();

  const {
    directions,
    loading: routeLoading,
    error: routeError,
  } = useDirections(
    form.origin?.location ?? null,
    form.destination?.location ?? null,
    {
      autoFetch: true,
      departureTime: form.departure_time,
    },
  );

  const handleChange = <K extends keyof RideFormValues>(
    field: K,
    value: RideFormValues[K],
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof RideFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const routeMeta = useMemo(() => {
    if (!directions) return null;
    return {
      distanceMeters: directions.distanceMeters,
      durationSeconds: directions.durationSeconds,
    };
  }, [directions]);

  useEffect(() => {
    if (directions && errors.route) {
      setErrors(prev => ({ ...prev, route: undefined }));
    }
  }, [directions, errors.route]);

  const handlePublish = async () => {
    const validationErrors = validateForm(form, !!directions);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const departureDate = form.departure_time as Date;
    const origin = form.origin!;
    const destination = form.destination!;

    const { rideId, error } = await publishRide({
      vehicle_id: form.vehicle_id,
      origin_lat: origin.location.lat,
      origin_lng: origin.location.lng,
      destination_lat: destination.location.lat,
      destination_lng: destination.location.lng,
      origin_address: origin.address,
      destination_address: destination.address,
      route_polyline: directions?.encodedPolyline,
      departure_time: departureDate.toISOString(),
      available_seats: parseInt(form.available_seats, 10),
      price_per_seat: parseFloat(form.price_per_seat),
    });

    if (error || !rideId) {
      handleRpcError(error ?? 'No se pudo publicar el viaje.');
      return;
    }

    navigation.replace('RideRequests', { rideId });
  };

  const handleRpcError = (message: string) => {
    if (message.includes('No autenticado')) {
      Alert.alert(
        'Sesión expirada',
        'Tu sesión ha caducado. Por favor vuelve a iniciar sesión.',
      );
      return;
    }

    if (message.includes('perfil de conductor aprobado')) {
      Alert.alert(
        'Sin permisos de conductor',
        'Tu cuenta aún no tiene un perfil de conductor aprobado. Contacta a administración.',
      );
      return;
    }

    if (
      message.includes('vehiculo no existe') ||
      message.includes('vehículo no existe') ||
      message.includes('no pertenece al conductor')
    ) {
      Alert.alert(
        'Vehículo no válido',
        'El vehículo seleccionado no está disponible. Selecciona otro.',
        [
          {
            text: 'Recargar vehículos',
            onPress: () => {
              reload();
              setForm(p => ({ ...p, vehicle_id: '' }));
            },
          },
        ],
      );
      return;
    }

    if (message.includes('hora de salida debe ser en el futuro')) {
      setErrors(prev => ({
        ...prev,
        departure_time:
          'La hora de salida debe ser al menos 15 minutos en el futuro',
      }));
      return;
    }

    if (message.includes('precio por asiento')) {
      setErrors(prev => ({
        ...prev,
        price_per_seat: 'El precio debe ser mayor a $0 MXN',
      }));
      return;
    }

    Alert.alert('Error al publicar', message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Publicar viaje</Text>
        <Text style={styles.subtitle}>
          Define el origen, el destino y el precio por asiento. Los pasajeros
          que vayan en tu misma dirección verán el viaje y podrán reservar.
        </Text>

        <RideForm
          values={form}
          errors={errors}
          onChange={handleChange}
          vehicles={vehicles}
          vehiclesLoading={vehiclesLoading}
          vehiclesError={vehiclesError}
          encodedPolyline={directions?.encodedPolyline ?? null}
          routeMeta={routeMeta}
          routeLoading={routeLoading}
          routeError={routeError}
        />

        <Button
          title={publishing ? 'Publicando...' : 'Publicar viaje'}
          onPress={handlePublish}
          loading={publishing}
          disabled={vehiclesLoading || routeLoading}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
