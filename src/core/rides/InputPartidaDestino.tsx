import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface Props {
  origin: string;
  destination: string;
  onOriginChange: (text: string) => void;
  onDestinationChange: (text: string) => void;
}

export default function InputPartidaDestino({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="¿Cuál es tu punto de partida?"
        placeholderTextColor="#9ca3af"
        value={origin}
        onChangeText={onOriginChange}
      />
      <TextInput
        style={styles.input}
        placeholder="¿Cuál es tu destino de llegada?"
        placeholderTextColor="#9ca3af"
        value={destination}
        onChangeText={onDestinationChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  input: {
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});