import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  distance: string;
  duration: string;
  possibleStops: string;
  departureTime: string;
  availableSeats: number;
}

export default function TarjetaDetalleRuta({
  distance,
  duration,
  possibleStops,
  departureTime,
  availableSeats,
}: Props) {
  return (
    <View style={styles.card}>
      {/* Indicador de arrastre */}
      <View style={styles.dragHandle} />

      <Text style={styles.title}>Detalle de la Ruta</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Distancia:</Text>
        <Text style={styles.value}>{distance}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tiempo:</Text>
        <Text style={styles.value}>{duration}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Paradas posibles:</Text>
        <Text style={styles.value}>{possibleStops}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Hora de Salida:</Text>
        <Text style={styles.value}>{departureTime}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Asientos disponibles:</Text>
        <Text style={styles.value}>{availableSeats} ⌄</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
});