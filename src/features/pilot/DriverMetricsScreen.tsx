import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../core/api/apiClient';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import {
  ScreenContainer,
  Text,
  ListRow,
  Skeleton,
  FeedbackState,
  IconButton,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { money } from '../../shared/format';
interface Metrics {
  periodDays: number;
  totalTrips: number;
  completed: number;
  cancelled: number;
  transportedPassengers: number;
  committedCents: number;
  collectedCents: number;
  pendingCents: number;
  rating: number | null;
}
export function DriverMetricsScreen() {
  const navigation = useNavigation();
  const { user } = useCurrentUserRole();
  const q = useQuery({
    queryKey: ['driver-metrics', user?.userId],
    queryFn: () => apiRequest<Metrics>('/me/driver-metrics'),
    enabled: !!user?.driverId,
  });
  const data = q.data;
  return (
    <ScreenContainer padded>
      <ScrollView contentContainerStyle={{ paddingVertical: 24, gap: 16 }}>
        <ScreenHeader
          title="Tus métricas"
          subtitle="Viajes con salida en los últimos 30 días."
          onBack={() => navigation.goBack()}
          actions={
            data ? (
              <IconButton
                variant="plain"
                loading={q.isFetching}
                onPress={() => void q.refetch()}
                iconName="refresh"
                accessibilityLabel="Actualizar métricas"
                disabled={q.isFetching}
              />
            ) : undefined
          }
        />
        {q.isLoading ? (
          <Skeleton height={240} />
        ) : q.error ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tus métricas"
            description={q.error.message}
            actionLabel="Reintentar"
            onAction={() => void q.refetch()}
          />
        ) : data ? (
          <>
            {[
              ['Viajes finalizados', String(data.completed)],
              ['Viajes cancelados', String(data.cancelled)],
              ['Pasajeros transportados', String(data.transportedPassengers)],
              ['Efectivo registrado', money(data.collectedCents)],
              ['Importe comprometido', money(data.committedCents)],
              ['Pendiente de registrar', money(data.pendingCents)],
              [
                'Calificación',
                data.rating == null
                  ? 'Sin calificaciones'
                  : Number(data.rating).toFixed(1),
              ],
            ].map(([label, value]) => (
              <ListRow
                key={label}
                title={label}
                trailing={
                  <Text
                    variant="title"
                    style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}
                  >
                    {value}
                  </Text>
                }
              />
            ))}
            <Text tone="secondary">
              Los importes corresponden a tus reservas y cobros en efectivo. Los
              viajes cancelados no generan ingresos.
            </Text>
          </>
        ) : (
          <FeedbackState
            title="Aún no hay métricas"
            description="Tus viajes y cobros aparecerán aquí."
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
