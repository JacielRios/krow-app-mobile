import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import Config from 'react-native-config';
import { requestStartupNotificationPermission } from './notificationPermission';

export function useNotificationPermissionStartup() {
  const enabled = Config.KROW_PILOT_PUSH_ENABLED === 'true';
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void requestStartupNotificationPermission()
        .catch(() => false)
        .finally(() => {
          if (alive) setReady(true);
        });
    };
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') start();
    });
    if (AppState.currentState === 'active') start();
    return () => {
      alive = false;
      listener.remove();
    };
  }, [enabled]);
  return ready;
}
