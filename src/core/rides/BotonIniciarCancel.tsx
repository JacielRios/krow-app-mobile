import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onStart: () => void;
  onCancel: () => void;
}

export default function BotonIniciarCancel({ onStart, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.startButton]} onPress={onStart} activeOpacity={0.8}>
        <Text style={styles.startIcon}>✓</Text>
        <Text style={styles.startText}>Iniciar Ride</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} activeOpacity={0.8}>
        <Text style={styles.cancelIcon}>✕</Text>
        <Text style={styles.cancelText}>Cancelar Ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  startButton: {
    backgroundColor: '#ffffff',
    borderColor: '#22c55e',
  },
  startIcon: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
  },
  startText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ef4444',
  },
  cancelIcon: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});