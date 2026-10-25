import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Text, StatusBadge } from '../../../shared/components/ui-v2';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { money } from '../../../shared/format';

/** Presentation only: the reservation owns the amount and the driver records receipt. */
export function CashPaymentSummary({
  amountCents,
  role,
  cashStatus,
}: {
  amountCents: number;
  role: 'driver' | 'passenger';
  cashStatus?: string | null;
}) {
  const { theme } = useTheme();
  const collected = cashStatus === 'collected';
  const voided = cashStatus === 'void';
  const pending = cashStatus === 'pending';
  const label = collected
    ? 'Efectivo recibido'
    : voided
    ? 'Cobro anulado'
    : pending
    ? role === 'driver'
      ? 'Por cobrar'
      : 'Pago pendiente'
    : cashStatus
    ? 'Estado por verificar'
    : 'Efectivo';
  const description = collected
    ? 'El conductor registró la recepción del efectivo.'
    : voided
    ? 'El cobro de esta reserva está anulado.'
    : pending
    ? role === 'driver'
      ? 'Confirma el cobro únicamente después de recibir el efectivo.'
      : 'Entrega el efectivo al conductor. Él confirmará la recepción en KROW.'
    : cashStatus
    ? 'Actualiza el viaje para consultar el estado del cobro.'
    : role === 'driver'
    ? 'Aportación total de esta reserva, en efectivo.'
    : 'Aportación total de tu reserva, en efectivo.';
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.heading}>
        <Icon
          name="payments"
          size={22}
          color={theme.colors.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
        <Text variant="caption" tone="secondary" style={styles.label}>
          Total de la reserva · MXN
        </Text>
      </View>
      <Text style={styles.amount}>{money(amountCents)}</Text>
      <StatusBadge
        label={label}
        tone={
          collected
            ? 'success'
            : voided
            ? 'neutral'
            : pending
            ? 'warning'
            : 'info'
        }
        size="sm"
      />
      <Text variant="caption" tone="secondary">
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderWidth: 1, borderRadius: 20, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1 },
  amount: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
