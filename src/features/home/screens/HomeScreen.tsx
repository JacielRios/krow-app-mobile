import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../../core/theme/colors';
import { Button } from '../../../core/components/ui/Button';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Krown</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pasajero</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Iniciado"
            onPress={() => navigation.navigate('PassengerActiveRide')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Finalizado"
            onPress={() => navigation.navigate('PassengerFinishedRide')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conductor</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Iniciado"
            onPress={() => navigation.navigate('DriverActiveRide')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Viaje Finalizado"
            onPress={() => navigation.navigate('DriverFinishedRide')}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 12,
  },
});
