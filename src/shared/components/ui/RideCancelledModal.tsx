import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme/tokens';
import { Button } from './Button';

export interface RideCancelledModalProps {
  visible: boolean;
  /**
   * Callback opcional. La pantalla puede usarlo para apagar su flag local de
   * `visible` antes/después de que el modal mande al usuario al Home. El
   * modal mismo nunca se descarta solo (no `onRequestClose` ni tap-outside),
   * por eso `onDismiss` se invoca únicamente desde el botón "Entendido".
   */
  onDismiss: () => void;
}

/**
 * Modal bloqueante que se muestra al pasajero cuando el conductor cancela
 * el viaje. No es descartable — ni con back button ni tocando afuera — y
 * siempre redirige al `Home` reseteando el stack.
 *
 * Vive en `shared/components/ui/` porque la usan dos pantallas:
 *   - `shared/RideScheduledScreen` (vista pasajero) cuando ride.status='cancelled'.
 *   - `passenger/PassengerActiveRideScreen` cuando el conductor cancela en pleno viaje.
 */
export const RideCancelledModal: React.FC<RideCancelledModalProps> = ({
  visible,
  onDismiss,
}) => {
  const navigation = useNavigation();

  const handleAcknowledge = () => {
    onDismiss();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      }),
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // No-op: bloqueamos el back de Android para que no se cierre solo.
      onRequestClose={() => undefined}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons
              name="warning-amber"
              size={32}
              color={colors.status.warning}
            />
          </View>
          <Text style={styles.title}>Viaje cancelado</Text>
          <Text style={styles.message}>
            El conductor canceló este viaje. Serás redirigido al inicio.
          </Text>
          <View style={styles.actionWrap}>
            <Button title="Entendido" onPress={handleAcknowledge} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionWrap: {
    marginTop: spacing.lg,
    width: '100%',
  },
});
