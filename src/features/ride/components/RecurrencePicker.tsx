import React from 'react';
import { Switch, View } from 'react-native';
import { Button, Text } from '../../../shared/components/ui-v2';
import { rideDate } from '../../../shared/format';
import { useTheme } from '../../../shared/theme/ThemeProvider';

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export function RecurrencePicker({
  enabled,
  weekdays,
  weeks,
  onToggle,
  onDays,
  onWeeks,
  dates,
  error,
  previewOnly = false,
}: {
  enabled: boolean;
  weekdays: number[];
  weeks: number;
  onToggle: () => void;
  onDays: (days: number[]) => void;
  onWeeks: (weeks: number) => void;
  dates: string[];
  error?: string;
  previewOnly?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {!previewOnly && (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 56,
              gap: 12,
            }}
          >
            <Text style={{ flex: 1 }}>Repetir en varias fechas</Text>
            <View
              style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
            >
              <Switch
                accessibilityLabel="Repetir en varias fechas"
                value={enabled}
                onValueChange={onToggle}
                trackColor={{
                  false: theme.colors.controlBorder,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.background}
              />
            </View>
          </View>
          {enabled && (
            <>
              <Text>Elige los días de salida</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {days.map((day, index) => (
                  <Button
                    key={day}
                    fullWidth={false}
                    size="sm"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: weekdays.includes(index) }}
                    title={`${day}${weekdays.includes(index) ? ' ✓' : ''}`}
                    variant={weekdays.includes(index) ? 'tonal' : 'ghost'}
                    onPress={() =>
                      onDays(
                        weekdays.includes(index)
                          ? weekdays.filter(d => d !== index)
                          : [...weekdays, index],
                      )
                    }
                  />
                ))}
              </View>
              <Text>Periodo desde la primera fecha</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[1, 2, 3, 4].map(value => (
                  <Button
                    key={value}
                    fullWidth={false}
                    size="sm"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: weeks === value }}
                    title={`${value} ${value === 1 ? 'semana' : 'semanas'}${
                      weeks === value ? ' ✓' : ''
                    }`}
                    variant={weeks === value ? 'tonal' : 'ghost'}
                    onPress={() => onWeeks(value)}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
      {enabled && (
        <>
          <Text variant="title">{dates.length} salidas por publicar</Text>
          <Text tone="secondary">
            Mismo recorrido, vehículo, cupo y aportación. Hora de Ciudad de
            México. Cada viaje se administra por separado.
          </Text>
          {error ? (
            <Text tone="error">{error}</Text>
          ) : (
            dates.map(date => <Text key={date}>{rideDate(date)}</Text>)
          )}
        </>
      )}
    </View>
  );
}
