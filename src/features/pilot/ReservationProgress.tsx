import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card, Text } from '../../shared/components/ui-v2';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { statusText } from '../../shared/format';

const stages = [
  'Solicitud enviada',
  'Lugar confirmado',
  'Subida confirmada',
  'Descenso confirmado',
];
const stageByStatus: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_progress: 2,
  completed: 3,
};
const guidance: Record<string, string> = {
  pending:
    'El conductor debe aceptar tu solicitud. Podrás enviarle mensajes después de la confirmación.',
  confirmed:
    'Tu lugar está reservado. Espera en el punto de encuentro; el conductor confirmará tu subida.',
  in_progress:
    'Ya estás en el viaje. Sigue tu recorrido y consulta tu parada de descenso.',
  completed:
    'Tu descenso está confirmado. Puedes revisar el efectivo y calificar tu experiencia.',
  rejected: 'El conductor no aceptó esta solicitud. Puedes buscar otro viaje.',
  cancelled: 'Esta reserva se canceló. Puedes buscar otro viaje.',
  no_show:
    'El conductor registró que no te presentaste. Esta reserva ya no permite seguir la ubicación.',
  interrupted:
    'La reserva se interrumpió. Consulta el detalle del viaje para revisar su resultado.',
};

/** Shows only status-based milestones, without inventing event dates. */
export function ReservationProgress({ status }: { status: string }) {
  const { theme } = useTheme();
  const current = stageByStatus[status];
  return (
    <Card>
      <View style={styles.content}>
        <Text variant="title" accessibilityRole="header">
          Estado de tu reserva
        </Text>
        {current == null ? (
          <Text>{statusText(status)}</Text>
        ) : (
          <View style={styles.stages}>
            {stages.map((label, index) => {
              const done = index < current || status === 'completed';
              const selected = index === current;
              const progress = done
                ? 'Completado'
                : selected
                ? 'Actual'
                : 'Pendiente';
              return (
                <View
                  key={label}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${label}. ${progress}. Etapa ${
                    index + 1
                  } de ${stages.length}`}
                >
                  <View
                    style={[
                      styles.marker,
                      {
                        backgroundColor: done
                          ? theme.colors.primary
                          : theme.colors.surfaceOverlay,
                        borderColor:
                          selected || done
                            ? theme.colors.primary
                            : theme.colors.border,
                      },
                    ]}
                  >
                    {done ? (
                      <MaterialIcons
                        name="check"
                        size={16}
                        color={theme.colors.textInverse}
                      />
                    ) : (
                      <Text
                        variant="caption"
                        style={{
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                        }}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    tone={selected || done ? 'primary' : 'secondary'}
                    style={styles.label}
                  >
                    {label}
                  </Text>
                  {selected && status !== 'completed' && (
                    <Text variant="caption" tone="secondary">
                      Actual
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <Text tone="secondary">
          {guidance[status] ??
            'Actualiza el viaje para consultar el estado de tu reserva.'}
        </Text>
      </View>
    </Card>
  );
}
const styles = StyleSheet.create({
  content: { gap: 16 },
  stages: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
