import { useEffect, useRef } from 'react';
import { KrowAlert } from '../ui-v2/dialogService';
export type AlertType = 'error' | 'success' | 'warning' | 'info';
interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  dismissOnBack?: boolean;
}
export function CustomAlert({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  confirmText = 'Entendido',
  dismissOnBack = true,
}: CustomAlertProps) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!visible) return;
    const id = KrowAlert.alert(
      title,
      message,
      [{ text: confirmText, onPress: () => close.current() }],
      { type, cancelable: dismissOnBack, onDismiss: () => close.current() },
    );
    return () => KrowAlert.cancel(id);
  }, [visible, type, title, message, confirmText, dismissOnBack]);
  return null;
}
