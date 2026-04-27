import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  onPress: () => void;
  disabled: boolean;
}

export default function BotonPublicarRide({ onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>Publicar Ride</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
  },
  disabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.7,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});