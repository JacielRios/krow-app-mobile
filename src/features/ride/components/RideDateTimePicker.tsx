import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';

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
 *
 * Usa `onValueChange` (v9+) en lugar del deprecado `onChange`.
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

  // ── Android: paso 1 — fecha ────────────────────────────────────────
  const handleAndroidDateSelect = (_event: any, selected: Date) => {
    if (_event?.type === 'dismissed' || _event?.nativeEvent?.type === 'dismissed') {
      setAndroidStep(null);
      return;
    }
    setTempDate(selected);
    // Primer paso terminado: pedir la hora
    setAndroidStep('time');
  };

  // ── Android: paso 2 — hora ─────────────────────────────────────────
  const handleAndroidTimeSelect = (_event: any, selected: Date) => {
    setAndroidStep(null);
    if (_event?.type === 'dismissed' || _event?.nativeEvent?.type === 'dismissed') return;
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

  // ── iOS: inline datetime ───────────────────────────────────────────
  const handleIOSValueChange = (_event: any, selected: Date) => {
    onChange(selected);
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
          color={colors.text.tertiary}
          style={styles.icon}
        />
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {value ? formatDateTime(value) : placeholder}
        </Text>
        <MaterialIcons
          name={showIOS ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={colors.text.tertiary}
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
            onValueChange={handleIOSValueChange}
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
          onValueChange={handleAndroidDateSelect}
        />
      )}

      {/* Picker Android: paso 2 — hora */}
      {Platform.OS === 'android' && androidStep === 'time' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onValueChange={handleAndroidTimeSelect}
          is24Hour={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    marginBottom: spacing.xs + 2,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  valueText: {
    flex: 1,
    fontSize: typography.size.lg,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.placeholder,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
  iosPickerWrapper: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
