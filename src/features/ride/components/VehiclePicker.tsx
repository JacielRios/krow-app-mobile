import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ListRow, Text } from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { DriverVehicle } from '../types';

interface VehiclePickerProps {
  label?: string;
  vehicles: DriverVehicle[];
  selectedId: string;
  onSelect: (vehicleId: string) => void;
  loading?: boolean;
  error?: string;
}
export const VehiclePicker = ({
  label = 'Tu vehículo',
  vehicles,
  selectedId,
  onSelect,
  loading,
  error,
}: VehiclePickerProps) => {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <Text variant="title" accessibilityRole="header">
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : vehicles.length === 0 ? (
        <Text tone="secondary">No tienes vehículos activos registrados.</Text>
      ) : (
        vehicles.map(vehicle => (
          <ListRow
            key={vehicle.vehicle_id}
            title={`${vehicle.brand} ${vehicle.model}`}
            subtitle={`${vehicle.car_year} · ${
              vehicle.license_plate
            } · ${Math.max(0, vehicle.capacity - 1)} lugares para compartir`}
            leading={
              <MaterialIcons
                name="directions-car"
                size={28}
                color={theme.colors.textSecondary}
              />
            }
            accessibilityRole="radio"
            selected={vehicle.vehicle_id === selectedId}
            onPress={() => onSelect(vehicle.vehicle_id)}
          />
        ))
      )}
      {error ? (
        <Text tone="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
};
