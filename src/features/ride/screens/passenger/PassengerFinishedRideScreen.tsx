import { IconButton } from '../../../../shared/components/ui-v2';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  useThemedStyles,
  type LegacyColors,
} from '../../../../shared/theme/legacyTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StarRating } from '../../components';
import { Button } from '../../../../shared/components/ui/Button';

export const PassengerFinishedRideScreen = ({ navigation }: any) => {
  const { styles, colors } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton
        style={[styles.closeButton, { top: insets.top + 8 }]}
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Volver al inicio"
        iconName="close"
        variant="plain"
        color={colors.text.primary}
      />

      <View style={styles.header}>
        <Text style={styles.title}>¡Has llegado a tu destino!</Text>
        <Text style={styles.subtitle}>
          Esperamos que hayas tenido un excelente viaje
        </Text>
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
          <Text style={styles.ratingTitle}>
            ¿Cómo calificarías a tu conductor?
          </Text>
          <StarRating rating={rating} onRatingChange={setRating} size={40} />
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            Añade un comentario (Opcional)
          </Text>
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

const createStyles = (colors: LegacyColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 10,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 0,
    },
    header: {
      paddingTop: 72,
      paddingBottom: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.text.primary,
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
