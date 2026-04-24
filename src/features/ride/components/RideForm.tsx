import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Input } from '../../../core/components/ui/Input';
import { colors } from '../../../core/theme/colors';
import { DriverVehicle } from '../types/ride.types';
import { VehiclePicker } from './VehiclePicker';
import { RideDateTimePicker } from './RideDateTimePicker';

export interface RideFormValues {
  origin_lat: string;
  origin_lng: string;
  destination_lat: string;
  destination_lng: string;
  available_seats: string;
  price_per_seat: string;
  vehicle_id: string;
  departure_time: Date | null;
}

export interface RideFormErrors {
  origin_lat?: string;
  origin_lng?: string;
  destination_lat?: string;
  destination_lng?: string;
  available_seats?: string;
  price_per_seat?: string;
  vehicle_id?: string;
  departure_time?: string;
}

interface RideFormProps {
  values: RideFormValues;
  errors: RideFormErrors;
  onChange: (field: keyof RideFormValues, value: string | Date | null) => void;
  vehicles: DriverVehicle[];
  vehiclesLoading: boolean;
  vehiclesError: string | null;
}

export const RideForm: React.FC<RideFormProps> = ({
  values,
  errors,
  onChange,
  vehicles,
  vehiclesLoading,
  vehiclesError,
}) => {
  return (
    <View>
      {/* ─── Origen ──────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Origen</Text>

      <Input
        label="Latitud de origen"
        placeholder="Ej: 19.432608"
        keyboardType="decimal-pad"
        value={values.origin_lat}
        onChangeText={v => onChange('origin_lat', v)}
        error={errors.origin_lat}
      />
      <Input
        label="Longitud de origen"
        placeholder="Ej: -99.133209"
        keyboardType="decimal-pad"
        value={values.origin_lng}
        onChangeText={v => onChange('origin_lng', v)}
        error={errors.origin_lng}
      />

      {/* ─── Destino ─────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Destino</Text>

      <Input
        label="Latitud de destino"
        placeholder="Ej: 19.504000"
        keyboardType="decimal-pad"
        value={values.destination_lat}
        onChangeText={v => onChange('destination_lat', v)}
        error={errors.destination_lat}
      />
      <Input
        label="Longitud de destino"
        placeholder="Ej: -99.230000"
        keyboardType="decimal-pad"
        value={values.destination_lng}
        onChangeText={v => onChange('destination_lng', v)}
        error={errors.destination_lng}
      />

      {/* ─── Detalles del viaje ──────────────────────── */}
      <Text style={styles.sectionTitle}>Detalles del viaje</Text>

      <RideDateTimePicker
        label="Fecha y hora de salida"
        value={values.departure_time}
        onChange={date => onChange('departure_time', date)}
        error={errors.departure_time}
        minimumDate={new Date()}
      />

      <Input
        label="Asientos disponibles"
        placeholder="Ej: 3"
        keyboardType="number-pad"
        value={values.available_seats}
        onChangeText={v => onChange('available_seats', v)}
        error={errors.available_seats}
      />

      <Input
        label="Precio por asiento (MXN)"
        placeholder="Ej: 45.00"
        keyboardType="decimal-pad"
        value={values.price_per_seat}
        onChangeText={v => onChange('price_per_seat', v)}
        error={errors.price_per_seat}
      />

      {/* ─── Vehículo ────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Vehículo</Text>

      {vehiclesError && (
        <Text style={styles.vehicleErrorBanner}>
          Error al cargar vehículos: {vehiclesError}
        </Text>
      )}

      <VehiclePicker
        label="Selecciona el vehículo"
        vehicles={vehicles}
        selectedId={values.vehicle_id}
        onSelect={id => onChange('vehicle_id', id)}
        loading={vehiclesLoading}
        error={errors.vehicle_id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  vehicleErrorBanner: {
    fontSize: 13,
    color: colors.status.error,
    marginBottom: 8,
  },
});
