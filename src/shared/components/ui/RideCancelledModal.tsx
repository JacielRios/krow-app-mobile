import React from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';

import { CustomAlert } from './CustomAlert';

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
    <CustomAlert
      visible={visible}
      type="warning"
      title="Viaje cancelado"
      message="El conductor canceló este viaje. Serás redirigido al inicio."
      dismissOnBack={false}
      onClose={handleAcknowledge}
    />
  );
};
