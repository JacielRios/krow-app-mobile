import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button } from '../../../shared/components/ui/Button';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import type { ActivePassenger } from '../hooks/useActiveRideData';

export interface PassengerStopCardProps {
  passenger: ActivePassenger;
  /** Deshabilita el botón cuando hay otra acción global en curso. */
  anyActionBusy: boolean;
  /** Loading puntual para esta tarjeta. */
  busy: boolean;
  onComplete: () => void;
}

/**
 * Tarjeta de pasajero usada en `DriverActiveRideScreen`. Muestra avatar,
 * nombre, rating, parada de destino y un badge de estado contextual:
 *   - confirmed / in_progress → "En camino"
 *   - completed → "Llegó"
 *
 * El botón "Llegamos" sólo aparece mientras el pasajero no está completed.
 */
export const PassengerStopCard: React.FC<PassengerStopCardProps> = ({
  passenger,
  anyActionBusy,
  busy,
  onComplete,
}) => {
  const name = passenger.fullName ?? 'Pasajero';
  const isCompleted = passenger.bookingStatus === 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar uri={passenger.profilePhoto ?? undefined} name={name} size="md" />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {passenger.rating != null && (
            <View style={styles.ratingRow}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.status.warning}
              />
              <Text style={styles.ratingText}>
                {passenger.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        {isCompleted ? (
          <StatusBadge tone="success" label="Llegó" size="sm" />
        ) : (
          <StatusBadge tone="info" label="En camino" size="sm" />
        )}
      </View>

      <View style={styles.stopRow}>
        <MaterialIcons name="place" size={16} color={colors.status.error} />
        <Text style={styles.stopText} numberOfLines={2}>
          {passenger.dropoffAddress ?? 'Parada del pasajero'}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <MaterialIcons
          name="event-seat"
          size={14}
          color={colors.text.secondary}
        />
        <Text style={styles.metaText}>
          {passenger.seatsReserved} asiento
          {passenger.seatsReserved === 1 ? '' : 's'}
        </Text>
      </View>

      {!isCompleted && (
        <View style={styles.action}>
          <Button
            title={busy ? 'Procesando…' : 'Llegamos'}
            onPress={onComplete}
            loading={busy}
            disabled={anyActionBusy}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  stopText: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: typography.size.md,
    color: colors.text.primary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  action: {
    marginTop: spacing.md,
  },
});
