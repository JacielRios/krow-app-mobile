import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Input } from '../../../shared/components/ui/Input';
import { colors } from '../../../shared/theme/colors';
import { spacing, typography, radii } from '../../../shared/theme/tokens';
import {
  PlacesAutocompleteInput,
  PlacesAutocompleteValue,
  RoutePreviewMap,
} from '../../maps';
import type { DriverVehicle } from '../types';
import { VehiclePicker } from './VehiclePicker';
import { RideDateTimePicker } from './RideDateTimePicker';

export interface RideFormValues {
  origin: PlacesAutocompleteValue | null;
  destination: PlacesAutocompleteValue | null;
  available_seats: string;
  price_per_seat: string;
  vehicle_id: string;
  departure_time: Date | null;
}

export interface RideFormErrors {
  origin?: string;
  destination?: string;
  available_seats?: string;
  price_per_seat?: string;
  vehicle_id?: string;
  departure_time?: string;
  route?: string;
}

interface RideFormProps {
  values: RideFormValues;
  errors: RideFormErrors;
  onChange: <K extends keyof RideFormValues>(
    field: K,
    value: RideFormValues[K],
  ) => void;
  vehicles: DriverVehicle[];
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  /** Polyline encoded (Google Directions) para mostrar la ruta. */
  encodedPolyline: string | null;
  /** Distancia y duración estimadas para mostrar al conductor. */
  routeMeta: {
    distanceMeters: number;
    durationSeconds: number;
  } | null;
  routeLoading: boolean;
  routeError: string | null;
}

const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const RideForm: React.FC<RideFormProps> = ({
  values,
  errors,
  onChange,
  vehicles,
  vehiclesLoading,
  vehiclesError,
  encodedPolyline,
  routeMeta,
  routeLoading,
  routeError,
}) => {
  const showPreview = !!values.origin && !!values.destination;

  return (
    <View>
      <Text style={styles.sectionTitle}>Ruta</Text>

      <PlacesAutocompleteInput
        label="Origen"
        placeholder="Ej: Av. Reforma, CDMX"
        value={values.origin}
        onChange={v => onChange('origin', v)}
        error={errors.origin}
        icon={
          <MaterialIcons
            name="trip-origin"
            size={20}
            color={colors.primary}
          />
        }
      />

      <PlacesAutocompleteInput
        label="Destino"
        placeholder="Ej: Polanco, CDMX"
        value={values.destination}
        onChange={v => onChange('destination', v)}
        error={errors.destination}
        icon={
          <MaterialIcons name="place" size={20} color={colors.status.error} />
        }
        bias={values.origin?.location ?? null}
      />

      {showPreview && (
        <View style={styles.previewWrap}>
          <RoutePreviewMap
            origin={values.origin?.location ?? null}
            destination={values.destination?.location ?? null}
            encodedPolyline={encodedPolyline}
            height={180}
          />
          <View style={styles.routeMetaRow}>
            {routeLoading ? (
              <View style={styles.metaItem}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.metaText}>Calculando ruta...</Text>
              </View>
            ) : routeMeta ? (
              <>
                <View style={styles.metaItem}>
                  <MaterialIcons
                    name="straighten"
                    size={16}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.metaText}>
                    {formatDistance(routeMeta.distanceMeters)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons
                    name="schedule"
                    size={16}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.metaText}>
                    {formatDuration(routeMeta.durationSeconds)}
                  </Text>
                </View>
              </>
            ) : routeError ? (
              <Text style={styles.routeErrorText}>{routeError}</Text>
            ) : null}
          </View>
          {errors.route && <Text style={styles.fieldError}>{errors.route}</Text>}
        </View>
      )}

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
        helperText="Este precio queda fijo: cada pasajero paga este monto por asiento."
      />

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
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewWrap: {
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  routeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  routeErrorText: {
    fontSize: typography.size.sm,
    color: colors.status.error,
  },
  fieldError: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.status.error,
  },
  vehicleErrorBanner: {
    fontSize: typography.size.sm,
    color: colors.status.error,
    marginBottom: spacing.sm,
  },
});
