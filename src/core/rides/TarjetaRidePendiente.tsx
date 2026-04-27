import React from 'react';
import { View, Image, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { HistoryRide, Companion } from '../types';
import BotonIniciarCancel from './BotonIniciarCancel';

interface Props {
  ride: HistoryRide;
  onStartRide: (id: string) => void;
  onCancelRide: (id: string) => void;
  onMessageCompanion: (id: string) => void;
}

export default function TarjetaRidePendiente({
  ride,
  onStartRide,
  onCancelRide,
  onMessageCompanion,
}: Props) {
  const renderCompanion = ({ item }: { item: Companion }) => (
    <View style={styles.companionRow}>
      <Image source={{ uri: item.photo }} style={styles.companionPhoto} />
      <View style={styles.companionInfo}>
        <Text style={styles.companionName}>{item.name}</Text>
        <Text style={styles.companionRating}>⭐ {item.rating}</Text>
      </View>
      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => onMessageCompanion(item.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.messageText}>Mensaje Privado</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Ride Programado</Text>
      <Text style={styles.time}>Salida: {ride.departureTime}</Text>
      <Text style={styles.seats}>Asientos: {ride.reservedSeats}</Text>

      <Text style={styles.companionsTitle}>Acompañantes:</Text>
      <FlatList
        data={ride.companions || []}
        renderItem={renderCompanion}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />

      <BotonIniciarCancel
        onStart={() => onStartRide(ride.id)}
        onCancel={() => onCancelRide(ride.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    color: '#1e3a8a',
    marginBottom: 4,
  },
  seats: {
    fontSize: 14,
    color: '#1e3a8a',
    marginBottom: 12,
  },
  companionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  companionPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  companionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  companionRating: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});