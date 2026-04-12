import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../core/theme/colors';
import { StarRating } from '../../components/StarRating';
import { Button } from '../../../../core/components/ui/Button';

export const PassengerFinishedRideScreen = ({ navigation }: any) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate('Home')}
      >
        <MaterialIcons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>¡Has llegado a tu destino!</Text>
        <Text style={styles.subtitle}>Esperamos que hayas tenido un excelente viaje</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={40} color={colors.text.muted} />
          </View>
          <Text style={styles.driverName}>Michelin</Text>
          <Text style={styles.carDetails}>Toyota Yaris - ABC-123</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>¿Cómo calificarías a tu conductor?</Text>
          <StarRating rating={rating} onRatingChange={setRating} size={40} />
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Añade un comentario (Opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Excelente servicio, muy amable..."
            placeholderTextColor={colors.text.placeholder}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <Button
          title="Enviar y Finalizar"
          onPress={() => navigation.navigate('Home')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.primary, // Fondo azul para destacar el header
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
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  driverInfo: {
    alignItems: 'center',
    marginTop: -50, // Sobresale hacia arriba
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 8,
  },
  carDetails: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginVertical: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  commentSection: {
    marginBottom: 32,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.text.primary,
  },
});
