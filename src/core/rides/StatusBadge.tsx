import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RideStatus } from 'src/types';

interface Props {
  status: RideStatus;
}

export default function StatusBadge({ status }: Props) {
  const getLabel = () => {
    switch (status) {
      case 'scheduled': return 'Pendiente';
      case 'in_progress': return 'En curso';
      case 'completed': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Estado: </Text>
      <Text style={styles.value}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});