import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import StatusBadge from './StatusBadge';
import BotonIniciarCancel from './BotonIniciarCancel';
import BotonVerDetalles from './Boton2VerDetalles';
import { HistoryRide } from '../types';

interface Props {
  ride: HistoryRide;
  isPast: boolean;
  onStartRide: (id: string) => void;
  onCancelRide: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function TarjetaHistorialRide({
  ride,
  isPast,
  onStartRide,
  onCancelRide,
  onViewDetails,
}: Props) {
  const showActionButtons = !isPast && (ride.status === 'scheduled' || ride.status === 'in_progress');

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png' }}
          style={styles.carIcon}
        />
        <View style={styles.info}>
          <StatusBadge status={ride.status} />
          <Text style={styles.detail}>
            <Text style={styles.label}>Hora de Salida: </Text>
            {ride.departureTime}
          </Text>
          <View style={styles.seatsRow}>
            <Text style={styles.label}>Asientos Reservados: </Text>
            <Text style={styles.seatsIcon}>👥 {ride.reservedSeats}</Text>
          </View>
        </View>
      </View>

      {showActionButtons ? (
        <BotonIniciarCancel
          onStart={() => onStartRide(ride.id)}
          onCancel={() => onCancelRide(ride.id)}
        />
      ) : (
        <BotonVerDetalles onPress={() => onViewDetails(ride.id)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  carIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  detail: {
    fontSize: 14,
    color: '#1e3a8a',
  },
  label: {
    fontWeight: '600',
    color: '#1e3a8a',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsIcon: {
    fontSize: 14,
    color: '#1e3a8a',
  },
});