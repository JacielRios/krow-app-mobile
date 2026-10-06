import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AnimatedPressable } from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { glass } from '../../../shared/theme/materials';
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
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : vehicles.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          No tienes vehículos activos registrados.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {vehicles.map(vehicle => {
            const selected = vehicle.vehicle_id === selectedId;
            return (
              <AnimatedPressable
                key={vehicle.vehicle_id}
                elevation={selected ? 2 : 1}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${vehicle.brand} ${vehicle.model}, ${vehicle.license_plate}`}
                onPress={() => onSelect(vehicle.vehicle_id)}
                contentStyle={[
                  styles.card,
                  glass(theme),
                  selected && {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.primarySoft,
                  },
                ]}
              >
                <View style={styles.top}>
                  <MaterialIcons
                    name="directions-car"
                    size={40}
                    color={theme.colors.primary}
                  />
                  <MaterialIcons
                    name={selected ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={
                      selected ? theme.colors.primary : theme.colors.textMuted
                    }
                  />
                </View>
                <Text
                  style={[styles.name, { color: theme.colors.textPrimary }]}
                >
                  {vehicle.brand} {vehicle.model}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }}>
                  {vehicle.car_year} · {vehicle.license_plate}
                </Text>
                <Text style={{ color: theme.colors.primary }}>
                  {Math.max(0, vehicle.capacity - 1)} lugares para compartir
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.status.error }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  label: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  rail: { padding: 8, gap: 14 },
  card: { width: 230, minHeight: 160, padding: 18, gap: 8 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 17, fontWeight: '700' },
});
