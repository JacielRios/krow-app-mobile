import { useCallback, useEffect, useRef } from 'react';
import { KrowAlert } from './dialogService';
interface Confirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  icon?: string;
}
/** Compatibility hook: all confirmations now share the app's single dialog host. */
export function useConfirmation() {
  const pending = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (pending.current !== undefined) KrowAlert.cancel(pending.current);
    },
    [],
  );
  const confirm = useCallback((next: Confirmation) => {
    if (pending.current !== undefined) KrowAlert.cancel(pending.current);
    const clear = () => {
      pending.current = undefined;
    };
    pending.current = KrowAlert.alert(
      next.title,
      next.message,
      [
        {
          text: next.confirmLabel,
          style: next.destructive ? 'destructive' : 'default',
          onPress: () => {
            clear();
            next.onConfirm();
          },
        },
        { text: 'Volver', style: 'cancel', onPress: clear },
      ],
      {
        type: next.destructive ? 'warning' : 'confirmation',
        icon: next.icon,
        cancelable: true,
        onDismiss: clear,
      },
    );
  }, []);
  return { confirm, dialog: null };
}
