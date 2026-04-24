import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../core/theme/colors';

interface RideDateTimePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * En Android, DateTimePicker solo muestra una cosa a la vez (fecha O hora).
 * Por eso usamos un flujo de dos pasos: primero fecha, luego hora.
 * En iOS usamos mode="datetime" que muestra ambos en un solo selector inline.
 */
export const RideDateTimePicker: React.FC<RideDateTimePickerProps> = ({
  label,
  value,
  onChange,
  error,
  minimumDate,
}) => {
  // Controla qué picker mostrar en Android: 'date' | 'time' | null
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  // En iOS usamos un toggle para mostrar/ocultar el picker inline
  const [showIOS, setShowIOS] = useState(false);

  // Fecha de trabajo interna para el flujo de dos pasos en Android
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date());

  const handleAndroidDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      // El usuario canceló
      setAndroidStep(null);
      return;
    }
    setTempDate(selected);
    // Primer paso terminado: pedir la hora
    setAndroidStep('time');
  };

  const handleAndroidTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setAndroidStep(null);
    if (!selected) return;

    // Combinar la fecha del paso 1 con la hora del paso 2
    const combined = new Date(
      tempDate.getFullYear(),
      tempDate.getMonth(),
      tempDate.getDate(),
      selected.getHours(),
      selected.getMinutes(),
    );
    onChange(combined);
  };

  const handleIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) onChange(selected);
  };

  const placeholder = 'Selecciona fecha y hora';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputContainer, error ? styles.inputError : null]}
        onPress={() => {
          if (Platform.OS === 'android') {
            setTempDate(value ?? new Date());
            setAndroidStep('date');
          } else {
            setShowIOS(prev => !prev);
          }
        }}
        activeOpacity={0.8}
        accessibilityLabel={label ?? 'Selector de fecha y hora'}
      >
        <MaterialIcons
          name="schedule"
          size={20}
          color={colors.text.muted}
          style={styles.icon}
        />
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {value ? formatDateTime(value) : placeholder}
        </Text>
        <MaterialIcons
          name={showIOS ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={colors.text.muted}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Picker iOS: se muestra inline bajo el botón */}
      {Platform.OS === 'ios' && showIOS && (
        <View style={styles.iosPickerWrapper}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            onChange={handleIOSChange}
            locale="es-MX"
          />
        </View>
      )}

      {/* Picker Android: paso 1 — fecha */}
      {Platform.OS === 'android' && androidStep === 'date' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidDateChange}
        />
      )}

      {/* Picker Android: paso 2 — hora */}
      {Platform.OS === 'android' && androidStep === 'time' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleAndroidTimeChange}
          is24Hour={false}
        />
      )}
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
  iosPickerWrapper: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
