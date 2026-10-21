import React from 'react';
import { View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AnimatedPressable, Text } from '../../shared/components/ui-v2';
import { useTheme } from '../../shared/theme/ThemeProvider';

export function RequestsShortcut({
  pending,
  driver,
  loading = false,
  error = false,
  onPress,
}: {
  pending: number;
  driver: boolean;
  loading?: boolean;
  error?: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const count = driver ? Math.max(0, pending) : 0;
  const highlighted = count > 0 && !error;
  const title = driver ? 'Solicitudes de viaje' : 'Solicitudes y respuestas';
  const detail = error
    ? 'No pudimos actualizar. Abre la bandeja para reintentar.'
    : loading
    ? 'Consultando solicitudes…'
    : highlighted
    ? `${count} ${
        count === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'
      } de respuesta`
    : driver
    ? 'Al día. Revisa tus solicitudes.'
    : 'Consulta el estado de tus reservas.';
  return (
    <AnimatedPressable
      radius={theme.radii.page}
      onPress={onPress}
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityState={{ busy: loading }}
      contentStyle={{
        minHeight: 80,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: highlighted
          ? theme.colors.primarySoft
          : theme.colors.surface,
      }}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceRaised,
        }}
      >
        <MaterialIcons
          name={driver ? 'inbox' : 'mark-email-read'}
          size={24}
          color={theme.colors.primary}
        />
        {highlighted && (
          <View
            style={{
              position: 'absolute',
              right: -4,
              top: -4,
              minWidth: 24,
              minHeight: 24,
              paddingHorizontal: 5,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.status.error,
              borderWidth: 2,
              borderColor: theme.colors.primarySoft,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                lineHeight: 16,
                fontWeight: '700',
                color: theme.colors.onDestructive,
              }}
            >
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        <Text
          variant="caption"
          tone="secondary"
          accessibilityLiveRegion="polite"
        >
          {detail}
        </Text>
      </View>
      <MaterialIcons
        name={error ? 'sync-problem' : 'chevron-right'}
        size={24}
        color={error ? theme.colors.status.warning : theme.colors.primary}
        accessible={false}
      />
    </AnimatedPressable>
  );
}
