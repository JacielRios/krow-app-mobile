import React from 'react';
import { StyleSheet, View } from 'react-native';
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
          <View
            style={styles.stages}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Progreso de tu reserva"
            accessibilityValue={{
              min: 1,
              max: stages.length,
              now: current + 1,
              text: stages[current],
            }}
          >
            <View style={styles.row}>
              <Text style={styles.label}>{stages[current]}</Text>
              <Text variant="caption" tone="secondary">
                {current + 1} de {stages.length}
              </Text>
            </View>
            <View style={styles.track}>
              {stages.map((label, index) => (
                <View
                  key={label}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        index <= current
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                />
              ))}
            </View>
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
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  label: { flex: 1, fontWeight: '600' },
});
