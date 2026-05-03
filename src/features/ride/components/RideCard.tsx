import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import type { AvailableRide } from '../types/rideSearch.types';

interface RideCardProps {
  ride: AvailableRide;
  /** Si true, el botón se transforma en "Solicitado" y queda deshabilitado. */
  alreadyRequested: boolean;
  /** Mostrar loader y deshabilitar el botón mientras se procesa la reserva. */
  requesting?: boolean;
  /** Tap en la card → expande detalle. */
  onPress: () => void;
  /** Tap en el botón principal → solicitar unirse. */
  onRequest: () => void;
}

const formatDepartureTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatPriceMxn = (value: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  alreadyRequested,
  requesting = false,
  onPress,
  onRequest,
}) => {
  const driverName = ride.driverName ?? 'Conductor';
  const seatsLabel =
    ride.availableSeats === 1
      ? '1 asiento disponible'
      : `${ride.availableSeats} asientos disponibles`;

  return (
    <Card
      variant="outlined"
      padding="md"
      radius="lg"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Avatar name={driverName} size="md" />
        <View style={styles.headerText}>
          <Text style={styles.driverName} numberOfLines={1}>
            {driverName}
          </Text>
          {ride.driverRating != null && (
            <View style={styles.ratingRow}>
              <MaterialIcons
                name="star"
                size={14}
                color={colors.status.warning}
              />
              <Text style={styles.ratingText}>
                {ride.driverRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <StatusBadge tone="info" label="Programado" size="sm" />
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeRow}>
          <MaterialIcons
            name="trip-origin"
            size={14}
            color={colors.primary}
            style={styles.routeIcon}
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.originAddress ?? 'Origen sin dirección'}
          </Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <MaterialIcons
            name="place"
            size={14}
            color={colors.status.error}
            style={styles.routeIcon}
          />
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.destinationAddress ?? 'Destino sin dirección'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {formatDepartureTime(ride.departureTime)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialIcons
            name="event-seat"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={styles.metaText}>{seatsLabel}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceWrap}>
          <Text style={styles.price}>{formatPriceMxn(ride.pricePerSeat)}</Text>
          <Text style={styles.priceUnit}>/ asiento</Text>
        </View>
        <View style={styles.actionWrap}>
          <Button
            title={alreadyRequested ? 'Solicitado' : 'Solicitar unirse'}
            onPress={onRequest}
            disabled={alreadyRequested || requesting}
            loading={requesting}
            size="sm"
            fullWidth={false}
            variant={alreadyRequested ? 'ghost' : 'primary'}
          />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  driverName: {
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
  routeBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIcon: {
    marginRight: spacing.sm,
  },
  routeText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  routeConnector: {
    height: 10,
    width: 1,
    backgroundColor: colors.border.default,
    marginLeft: 6,
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  priceUnit: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  actionWrap: {
    minWidth: 140,
  },
});
