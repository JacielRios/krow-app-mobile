import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Switch,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Config from 'react-native-config';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, Text } from '../../shared/components/ui-v2';
import { useTheme } from '../../shared/theme/ThemeProvider';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './notificationPermission';
import { registerPilotPush } from './pilotPush';
import { registerTripNotifications } from '../ride-runtime/pushRegistration';

export function NotificationSettings() {
  const { theme } = useTheme();
  const [permission, setPermission] =
    useState<NotificationPermissionState | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const mounted = useRef(true),
    focused = useRef(false),
    revision = useRef(0),
    locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setChecking(true);
    try {
      const state = await getNotificationPermissionState();
      if (mounted.current && current === revision.current) {
        setPermission(state);
        setPermissionError('');
        if (state !== 'granted') setRegistrationFailed(false);
      }
    } catch {
      if (mounted.current && current === revision.current) {
        setPermission('unavailable');
        setPermissionError(
          'No pudimos comprobar el permiso. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (mounted.current && current === revision.current) setChecking(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void refresh();
      return () => {
        focused.current = false;
        ++revision.current;
      };
    }, [refresh]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && focused.current) void refresh();
      else if (state !== 'active') ++revision.current;
    });
    return () => listener.remove();
  }, [refresh]);
  const settings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      if (mounted.current)
        setError(
          'No pudimos abrir Ajustes. Puedes cambiar el permiso desde los ajustes del dispositivo.',
        );
    }
  };
  const register = async () => {
    if (Config.KROW_RUNTIME_ENABLED === 'true')
      await registerTripNotifications();
    else if (Platform.OS === 'android') await registerPilotPush(false);
  };
  const toggle = async () => {
    if (locked.current || checking) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      if (
        permission === 'granted' ||
        (Platform.OS === 'ios' && permission === 'denied') ||
        (Platform.OS === 'android' && Number(Platform.Version) < 33)
      ) {
        await settings();
        return;
      }
      const state = await requestNotificationPermission();
      if (!mounted.current) return;
      setPermission(state);
      if (state === 'granted') {
        try {
          await register();
          if (mounted.current) setRegistrationFailed(false);
        } catch {
          if (mounted.current) {
            setRegistrationFailed(true);
          }
        }
      }
    } catch {
      if (mounted.current)
        setError(
          'No pudimos cambiar el permiso. Revisa los ajustes del dispositivo.',
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
      if (mounted.current && focused.current) void refresh();
    }
  };
  const granted = permission === 'granted';
  const unknown = permission === null || permission === 'unavailable';
  const status = checking
    ? 'Consultando permiso…'
    : permission === 'unavailable'
    ? 'No se pudo verificar el permiso'
    : granted
    ? 'Permiso activado'
    : permission === 'notDetermined'
    ? 'Permiso sin solicitar'
    : 'Desactivadas en el dispositivo';
  return (
    <View style={{ gap: 12 }}>
      <Text variant="title">Avisos del viaje</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 64,
        }}
      >
        <MaterialIcons
          name={
            unknown
              ? 'notifications-none'
              : granted
              ? 'notifications-active'
              : 'notifications-off'
          }
          size={24}
          color={granted ? theme.colors.primary : theme.colors.textSecondary}
          accessible={false}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ fontWeight: '600' }}>
            Notificaciones del dispositivo
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            accessibilityLiveRegion="polite"
          >
            {status}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator
            color={theme.colors.primary}
            accessibilityLabel="Actualizando notificaciones"
          />
        ) : null}
        <View style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}>
          <Switch
            value={granted}
            disabled={checking || busy || unknown}
            onValueChange={() => void toggle()}
            accessibilityLabel="Permiso de notificaciones"
            accessibilityHint={
              granted
                ? 'Abre Ajustes para desactivar las notificaciones.'
                : 'Solicita el permiso o abre los ajustes del dispositivo.'
            }
            trackColor={{
              false: theme.colors.controlBorder,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.background}
          />
        </View>
      </View>
      <Text variant="caption" tone="secondary">
        {granted
          ? 'Para desactivarlas, cambia el permiso en Ajustes. KROW comprobará el estado al regresar.'
          : 'Permite las notificaciones para recibir avisos fuera de KROW. Si están bloqueadas, actívalas en Ajustes.'}
      </Text>
      {Platform.OS === 'ios' && Config.KROW_RUNTIME_ENABLED !== 'true' && (
        <Text variant="caption" tone="secondary">
          Los avisos de viaje de esta versión están disponibles en Android. Aquí
          puedes administrar el permiso de tu dispositivo.
        </Text>
      )}
      {!!error && (
        <Text tone="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {!!permissionError && (
        <Text tone="error" accessibilityLiveRegion="polite">
          {permissionError}
        </Text>
      )}
      {registrationFailed && granted && (
        <Text tone="error" accessibilityLiveRegion="polite">
          El permiso está activado, pero no pudimos registrar los avisos del
          viaje. Reintenta cuando tengas conexión.
        </Text>
      )}
      {registrationFailed && (
        <Button
          title="Reintentar registro de avisos"
          variant="tonal"
          disabled={busy || !granted}
          onPress={() => {
            if (locked.current) return;
            locked.current = true;
            setBusy(true);
            void register()
              .then(() => {
                if (mounted.current) {
                  setRegistrationFailed(false);
                  setError('');
                }
              })
              .catch(() => {
                if (mounted.current)
                  setError(
                    'No pudimos registrar los avisos. Revisa tu conexión.',
                  );
              })
              .finally(() => {
                locked.current = false;
                if (mounted.current) setBusy(false);
              });
          }}
        />
      )}
      <View style={{ gap: 8 }}>
        <Button
          title="Abrir ajustes de notificaciones"
          iconName="settings"
          variant="text"
          onPress={() => void settings()}
        />
        {unknown && !checking && (
          <Button
            title="Revisar permiso"
            iconName="refresh"
            variant="text"
            onPress={() => void refresh()}
          />
        )}
      </View>
    </View>
  );
}
