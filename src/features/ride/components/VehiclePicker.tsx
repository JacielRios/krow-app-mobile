import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../core/theme/colors';
import type { DriverVehicle } from '../types';

interface VehiclePickerProps {
  label?: string;
  vehicles: DriverVehicle[];
  selectedId: string;
  onSelect: (vehicleId: string) => void;
  loading?: boolean;
  error?: string;
}

function vehicleLabel(v: DriverVehicle): string {
  return `${v.brand} ${v.model} ${v.car_year} · ${v.license_plate}`;
}

export const VehiclePicker: React.FC<VehiclePickerProps> = ({
  label,
  vehicles,
  selectedId,
  onSelect,
  loading = false,
  error,
}) => {
  const [visible, setVisible] = useState(false);

  const selected = vehicles.find(v => v.vehicle_id === selectedId);
  const displayValue = selected ? vehicleLabel(selected) : null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputContainer, error ? styles.inputError : null]}
        onPress={() => !loading && setVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel={label ?? 'Seleccionar vehículo'}
      >
        <MaterialIcons
          name="directions-car"
          size={20}
          color={colors.text.muted}
          style={styles.icon}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.flex} />
        ) : (
          <Text
            style={[styles.valueText, !displayValue && styles.placeholder]}
            numberOfLines={1}
          >
            {displayValue ?? 'Selecciona tu vehículo'}
          </Text>
        )}
        <MaterialIcons
          name="keyboard-arrow-down"
          size={20}
          color={colors.text.muted}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Selecciona tu vehículo</Text>
                {vehicles.length === 0 ? (
                  <Text style={styles.emptyText}>No tienes vehículos activos registrados.</Text>
                ) : (
                  <FlatList
                    data={vehicles}
                    keyExtractor={item => item.vehicle_id}
                    renderItem={({ item }) => {
                      const isSelected = item.vehicle_id === selectedId;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.optionItem,
                            isSelected && styles.optionItemSelected,
                          ]}
                          onPress={() => {
                            onSelect(item.vehicle_id);
                            setVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && styles.optionTextSelected,
                            ]}
                          >
                            {vehicleLabel(item)}
                          </Text>
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={18}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.background,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  icon: {
    marginRight: 8,
  },
  flex: {
    flex: 1,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.placeholder,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 12,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '85%',
    maxHeight: '60%',
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  emptyText: {
    padding: 16,
    color: colors.text.muted,
    fontSize: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionItemSelected: {
    backgroundColor: colors.surface,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
