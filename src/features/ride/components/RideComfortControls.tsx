import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  AnimatedPressable,
  Button,
  Input,
  Surface,
} from '../../../shared/components/ui-v2';
import { ValueSlider } from '../../../shared/components/ui-v2/ValueSlider';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { SeatDial } from './SeatDial';

interface Props {
  seats: string;
  onSeatsChange: (value: string) => void;
  maxSeats: number;
  price: string;
  onPriceChange: (value: string) => void;
  optional?: boolean;
}

export const RideComfortControls = ({
  seats,
  onSeatsChange,
  maxSeats,
  price,
  onPriceChange,
  optional,
}: Props) => {
  const { theme } = useTheme();
  const [precise, setPrecise] = useState(false);
  const range = useRef(200);
  if (Number.isFinite(Number(price)))
    range.current = Math.max(
      range.current,
      Math.ceil(Number(price) / 100) * 100,
    );
  return (
    <>
      <Surface contentStyle={styles.panel} style={styles.space}>
        <View style={styles.heading}>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Espacio para compartir
            </Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              {maxSeats > 0
                ? `Hasta ${maxSeats} asientos. Gira el dial o toca un lugar.`
                : 'Elige un vehículo para ver su capacidad.'}
            </Text>
          </View>
          <SeatDial
            value={seats === '' ? null : Number(seats)}
            max={maxSeats}
            onChange={value => onSeatsChange(String(value))}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seats}
        >
          {Array.from({ length: maxSeats }, (_, i) => i + 1).map(count => (
            <AnimatedPressable
              key={count}
              elevation={Number(seats) === count ? 2 : 0}
              accessibilityRole="radio"
              accessibilityState={{ selected: Number(seats) === count }}
              accessibilityLabel={`${count} asientos`}
              onPress={() => onSeatsChange(String(count))}
              contentStyle={[
                styles.seat,
                {
                  backgroundColor:
                    Number(seats) === count
                      ? theme.colors.primary
                      : theme.colors.surfaceOverlay,
                },
              ]}
            >
              <MaterialIcons
                name="event-seat"
                size={22}
                color={
                  Number(seats) === count
                    ? theme.colors.textInverse
                    : theme.colors.primary
                }
              />
              <Text
                style={{
                  color:
                    Number(seats) === count
                      ? theme.colors.textInverse
                      : theme.colors.textPrimary,
                  fontWeight: '700',
                }}
              >
                {count}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
        {optional && seats !== '' && (
          <Button
            title="Sin cupo predeterminado"
            variant="text"
            onPress={() => onSeatsChange('')}
          />
        )}
      </Surface>
      <Surface contentStyle={styles.panel} style={styles.space}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Aportación por asiento
        </Text>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Desliza para ajustar el monto en pesos.
        </Text>
        <ValueSlider
          label="MXN"
          value={
            price === '' || !Number.isFinite(Number(price))
              ? null
              : Number(price)
          }
          min={1}
          max={range.current}
          onChange={value => onPriceChange(String(value))}
          formatValue={value => `$${value.toFixed(2)}`}
        />
        <View style={styles.quickAmounts}>
          {[20, 35, 50, 75].map(amount => (
            <Button
              key={amount}
              title={`$${amount}`}
              size="sm"
              fullWidth={false}
              variant={Number(price) === amount ? 'primary' : 'outline'}
              accessibilityLabel={`${amount} pesos por asiento`}
              accessibilityState={{ selected: Number(price) === amount }}
              onPress={() => onPriceChange(String(amount))}
            />
          ))}
        </View>
        <Button
          title={precise ? 'Ocultar monto exacto' : 'Ingresar otro monto'}
          variant="text"
          onPress={() => setPrecise(!precise)}
        />
        {precise && (
          <Input
            label="Monto exacto (MXN)"
            value={price}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
          />
        )}
        {optional && price !== '' && (
          <Button
            title="Sin precio predeterminado"
            variant="text"
            onPress={() => onPriceChange('')}
          />
        )}
      </Surface>
    </>
  );
};
const styles = StyleSheet.create({
  panel: { padding: 20, gap: 12 },
  space: { marginBottom: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  copy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  dial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 30, fontWeight: '700' },
  seats: { gap: 10, paddingVertical: 8, paddingHorizontal: 2 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seat: {
    width: 56,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
