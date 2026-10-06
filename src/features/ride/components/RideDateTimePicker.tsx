import { Button, Surface } from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
  const { theme } = useTheme();
  // Controla qué picker mostrar en Android: 'date' | 'time' | null
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  // En iOS usamos un toggle para mostrar/ocultar el picker inline
  const [showIOS, setShowIOS] = useState(false);
  const [quickChoice, setQuickChoice] = useState<{
    minutes: number;
    time: number;
  } | null>(null);

  // Fecha de trabajo interna para el flujo de dos pasos en Android
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date());

  const handleAndroidDateChange = (
    _event: DateTimePickerChangeEvent,
    selected: Date,
  ) => {
    setTempDate(selected);
    // Primer paso terminado: pedir la hora
    setAndroidStep('time');
  };

  const handleAndroidTimeChange = (
    _event: DateTimePickerChangeEvent,
    selected: Date,
  ) => {
    setAndroidStep(null);

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

  const handleIOSChange = (
    _event: DateTimePickerChangeEvent,
    selected: Date,
  ) => {
    onChange(selected);
  };

  const placeholder = 'Selecciona fecha y hora';

  return (
    <Surface style={styles.container} contentStyle={{ padding: 18 }}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[30, 60, 120].map(minutes => (
          <Button
            key={minutes}
            title={
              minutes === 30
                ? 'En 30 min'
                : minutes === 60
                ? 'En 1 hora'
                : 'En 2 horas'
            }
            variant={
              quickChoice?.minutes === minutes &&
              value?.getTime() === quickChoice.time
                ? 'primary'
                : 'ghost'
            }
            accessibilityState={{
              selected:
                quickChoice?.minutes === minutes &&
                value?.getTime() === quickChoice.time,
            }}
            disabled={
              Date.now() + minutes * 60000 < (minimumDate?.getTime() ?? 0)
            }
            size="sm"
            fullWidth={false}
            onPress={() => {
              const date = new Date(Date.now() + minutes * 60000);
              setQuickChoice({ minutes, time: date.getTime() });
              onChange(date);
            }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surfaceOverlay,
            borderColor: theme.colors.border,
            borderRadius: 18,
          },
          error ? { borderColor: theme.colors.status.error } : null,
        ]}
        onPress={() => {
          setQuickChoice(null);
          if (Platform.OS === 'android') {
            setTempDate(value ?? new Date());
            setAndroidStep('date');
          } else {
            setShowIOS(prev => !prev);
          }
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Fecha y hora'}. ${
          value ? formatDateTime(value) : placeholder
        }`}
      >
        <MaterialIcons
          name="schedule"
          size={20}
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text style={[styles.valueText, { color: theme.colors.textPrimary }]}>
          {value ? formatDateTime(value) : placeholder}
        </Text>
        <MaterialIcons
          name={showIOS ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {error && (
        <Text
          accessibilityRole="alert"
          style={[styles.errorText, { color: theme.colors.status.error }]}
        >
          {error}
        </Text>
      )}

      {/* Picker iOS: se muestra inline bajo el botón */}
      {Platform.OS === 'ios' && showIOS && (
        <View
          style={[
            styles.iosPickerWrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <DateTimePicker
            value={value ?? new Date()}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            onValueChange={handleIOSChange}
            locale="es-MX"
            themeVariant={theme.dark ? 'dark' : 'light'}
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
          onValueChange={handleAndroidDateChange}
          onDismiss={() => setAndroidStep(null)}
        />
      )}

      {/* Picker Android: paso 2 — hora */}
      {Platform.OS === 'android' && androidStep === 'time' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onValueChange={handleAndroidTimeChange}
          onDismiss={() => setAndroidStep(null)}
          is24Hour={false}
        />
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  iosPickerWrapper: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
