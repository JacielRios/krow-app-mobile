import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onAccept: () => void;
  onReject: () => void;
}

export default function BotonAccionSolicitud({ onAccept, onReject }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.acceptButton]}
        onPress={onAccept}
        activeOpacity={0.8}
      >
        <Text style={styles.acceptIcon}>✓</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.rejectButton]}
        onPress={onReject}
        activeOpacity={0.8}
      >
        <Text style={styles.rejectIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  rejectIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});