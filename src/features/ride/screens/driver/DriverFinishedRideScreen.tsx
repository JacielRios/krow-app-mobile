import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../core/theme/colors';
import { StarRating } from '../../components/StarRating';
import { Button } from '../../../../core/components/ui/Button';

// Dummy data for passengers
const initialPassengers = [
  { id: '1', name: 'Ana S.', rating: 0, comment: '' },
  { id: '2', name: 'Luis M.', rating: 0, comment: '' },
];

export const DriverFinishedRideScreen = ({ navigation }: any) => {
  const [passengers, setPassengers] = useState(initialPassengers);

  const updatePassengerRating = (id: string, rating: number) => {
    setPassengers(prev => prev.map(p => p.id === id ? { ...p, rating } : p));
  };

  const updatePassengerComment = (id: string, comment: string) => {
    setPassengers(prev => prev.map(p => p.id === id ? { ...p, comment } : p));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => navigation.navigate('Home')}
      >
        <MaterialIcons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>¡Viaje Completado!</Text>
        <Text style={styles.subtitle}>Has llegado al destino final</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Pasajeros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Minutos</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Califica a tus pasajeros</Text>
        
        {passengers.map((p, index) => (
          <View key={p.id} style={styles.passengerFeedbackCard}>
            <View style={styles.passengerHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{p.name.charAt(0)}</Text>
              </View>
              <Text style={styles.passengerName}>{p.name}</Text>
            </View>

            <View style={styles.ratingContainer}>
              <StarRating 
                rating={p.rating} 
                onRatingChange={(r) => updatePassengerRating(p.id, r)} 
                size={32} 
              />
            </View>

            <TextInput
              style={styles.textInput}
              placeholder={`Añade un comentario sobre ${p.name}...`}
              placeholderTextColor={colors.text.placeholder}
              value={p.comment}
              onChangeText={(text) => updatePassengerComment(p.id, text)}
            />

            {index < passengers.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={styles.submitSection}>
          <Button 
            title="Enviar calificaciones" 
            onPress={() => navigation.navigate('Home')} 
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.primary, // Fondo azul
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  header: {
    paddingTop: 100,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.inverse,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.inverse,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  passengerFeedbackCard: {
    marginBottom: 16,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: 12,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    padding: 12,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 24,
  },
  submitSection: {
    marginTop: 24,
    marginBottom: 40,
  },
});
