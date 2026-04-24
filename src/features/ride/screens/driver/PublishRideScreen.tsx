import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../../core/theme/colors';
import { Button } from '../../../../core/components/ui/Button';
import { RideForm, RideFormErrors, RideFormValues } from '../../components/RideForm';
import { useDriverVehicles } from '../../hooks/useDriverVehicles';
import { useCreateRide } from '../../hooks/useCreateRide';

const INITIAL_FORM: RideFormValues = {
  origin_lat: '',
  origin_lng: '',
  destination_lat: '',
  destination_lng: '',
  available_seats: '',
  price_per_seat: '',
  vehicle_id: '',
  departure_time: null,
};

function validateForm(values: RideFormValues): RideFormErrors {
  const errors: RideFormErrors = {};

  const originLat = parseFloat(values.origin_lat);
  const originLng = parseFloat(values.origin_lng);
  const destLat = parseFloat(values.destination_lat);
  const destLng = parseFloat(values.destination_lng);
  const seats = parseInt(values.available_seats, 10);
  const price = parseFloat(values.price_per_seat);

  if (!values.origin_lat || isNaN(originLat) || originLat < -90 || originLat > 90) {
    errors.origin_lat = 'Ingresa una latitud válida (-90 a 90)';
  }
  if (!values.origin_lng || isNaN(originLng) || originLng < -180 || originLng > 180) {
    errors.origin_lng = 'Ingresa una longitud válida (-180 a 180)';
  }
  if (!values.destination_lat || isNaN(destLat) || destLat < -90 || destLat > 90) {
    errors.destination_lat = 'Ingresa una latitud válida (-90 a 90)';
  }
  if (!values.destination_lng || isNaN(destLng) || destLng < -180 || destLng > 180) {
    errors.destination_lng = 'Ingresa una longitud válida (-180 a 180)';
  }
  if (!values.departure_time) {
    errors.departure_time = 'Selecciona la fecha y hora de salida';
  } else if (values.departure_time.getTime() <= Date.now()) {
    errors.departure_time = 'La hora de salida debe ser en el futuro';
  }
  if (!values.available_seats || isNaN(seats) || seats < 1 || seats > 6) {
    errors.available_seats = 'Los asientos deben ser entre 1 y 6';
  }
  if (!values.price_per_seat || isNaN(price) || price <= 0) {
    errors.price_per_seat = 'El precio debe ser mayor a $0';
  }
  if (!values.vehicle_id) {
    errors.vehicle_id = 'Selecciona un vehículo';
  }

  return errors;
}

function hasErrors(errors: RideFormErrors): boolean {
  return Object.values(errors).some(v => v !== undefined);
}

export const PublishRideScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<RideFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<RideFormErrors>({});

  const { vehicles, loading: vehiclesLoading, error: vehiclesError, reload } = useDriverVehicles();
  const { createRide, loading: publishing } = useCreateRide();

  const handleChange = (field: keyof RideFormValues, value: string | Date | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Limpiar el error del campo cuando el usuario lo corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePublish = async () => {
    const validationErrors = validateForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    // departure_time ya está validado como no-null aquí
    const departureDate = form.departure_time as Date;

    const { rideId, error } = await createRide({
      vehicle_id: form.vehicle_id,
      origin_lat: parseFloat(form.origin_lat),
      origin_lng: parseFloat(form.origin_lng),
      destination_lat: parseFloat(form.destination_lat),
      destination_lng: parseFloat(form.destination_lng),
      // toISOString() convierte a UTC con "Z"; la BD recibe timestamptz
      // correcto independientemente del timezone del dispositivo
      departure_time: departureDate.toISOString(),
      available_seats: parseInt(form.available_seats, 10),
      price_per_seat: parseFloat(form.price_per_seat),
    });

    if (error) {
      handleRpcError(error);
      return;
    }

    // Éxito: navegar a la pantalla del viaje creado
    navigation.replace('DriverActiveRide', { rideId });
  };

  const handleRpcError = (message: string) => {
    if (message.includes('No autenticado')) {
      Alert.alert(
        'Sesión expirada',
        'Tu sesión ha caducado. Por favor vuelve a iniciar sesión.',
        [{ text: 'Ir al login', onPress: () => navigation.replace('Auth') }],
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

    if (message.includes('vehículo no existe') || message.includes('no pertenece al conductor')) {
      Alert.alert(
        'Vehículo no válido',
        'El vehículo seleccionado no está disponible. Selecciona otro.',
        [{ text: 'Recargar vehículos', onPress: () => { reload(); setForm(p => ({ ...p, vehicle_id: '' })); } }],
      );
      return;
    }

    if (message.includes('hora de salida debe ser en el futuro')) {
      setErrors(prev => ({
        ...prev,
        departure_time: 'La hora de salida debe ser en el futuro',
      }));
      return;
    }

    if (message.includes('precio por asiento')) {
      setErrors(prev => ({
        ...prev,
        price_per_seat: 'El precio debe ser mayor a $0',
      }));
      return;
    }

    // Error genérico no contemplado arriba
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
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Publicar viaje</Text>
        <Text style={styles.subtitle}>
          Completa los datos para que los pasajeros puedan ver y reservar tu viaje.
        </Text>

        <RideForm
          values={form}
          errors={errors}
          onChange={handleChange}
          vehicles={vehicles}
          vehiclesLoading={vehiclesLoading}
          vehiclesError={vehiclesError}
        />

        <Button
          title={publishing ? 'Publicando...' : 'Publicar viaje'}
          onPress={handlePublish}
          loading={publishing}
          disabled={vehiclesLoading}
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
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 8,
  },
});
