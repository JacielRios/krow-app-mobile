import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Button, Card } from '../../../shared/components/ui-v2';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import type { AvailableRide } from '../types/rideSearch.types';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { formatStopDistance } from '../domain/formatStopDistance';

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  alreadyRequested,
  requesting = false,
  onPress,
  onRequest,
}) => {
  const { theme } = useTheme();
  const driverName = ride.driverName ?? 'Conductor';
  const seatsLabel =
    ride.availableSeats === 1
      ? '1 asiento disponible'
      : `${ride.availableSeats} asientos disponibles`;

  return (
    <Card
      variant="elevated"
      padding="md"
      radius="lg"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Avatar name={driverName} size="md" />
        <View style={styles.headerText}>
          <Text
            style={[styles.driverName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {driverName}
          </Text>
          {ride.driverRating != null && (
            <View style={styles.ratingRow}>
              <MaterialIcons
                name="star"
                size={14}
                color={theme.colors.status.warning}
              />
              <Text
                style={[
                  styles.ratingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {ride.driverRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <StatusBadge tone="info" label="Programado" size="sm" />
      </View>

      <View
        style={[
          styles.routeBlock,
          { backgroundColor: theme.colors.surfaceOverlay },
        ]}
      >
        <View style={styles.routeRow}>
          <MaterialIcons
            name="trip-origin"
            size={14}
            color={theme.colors.primary}
            style={styles.routeIcon}
          />
          <Text
            style={[styles.routeText, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {ride.originAddress ?? 'Origen sin dirección'}
          </Text>
        </View>
        <View
          style={[
            styles.routeConnector,
            { backgroundColor: theme.colors.border },
          ]}
        />
        <View style={styles.routeRow}>
          <MaterialIcons
            name="place"
            size={14}
            color={colors.status.error}
            style={styles.routeIcon}
          />
          <Text
            style={[styles.routeText, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {ride.destinationAddress ?? 'Destino sin dirección'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.matchBlock,
          { backgroundColor: theme.colors.primarySoft },
        ]}
      >
        {!!ride.corridorName && (
          <Text style={[styles.matchText, { color: theme.colors.textPrimary }]}>
            Por {ride.corridorName}
          </Text>
        )}
        <Text style={[styles.matchText, { color: theme.colors.textPrimary }]}>
          Sube en {ride.bestPickupStop.name}
        </Text>
        <Text style={[styles.matchText, { color: theme.colors.textPrimary }]}>
          Bajada recomendada: {ride.bestDropoffStop.name} ·{' '}
          {formatStopDistance(ride.match.dropoffDistanceMeters)} aprox. de tu
          destino
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.metaText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {formatDepartureTime(ride.departureTime)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialIcons
            name="event-seat"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.metaText, { color: theme.colors.textSecondary }]}
          >
            {seatsLabel}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceWrap}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {formatPriceMxn(ride.pricePerSeat)}
          </Text>
          <Text
            style={[styles.priceUnit, { color: theme.colors.textSecondary }]}
          >
            / asiento
          </Text>
        </View>
        <View style={styles.actionWrap}>
          <Button
            title={alreadyRequested ? 'Solicitado' : 'Ver ruta y paradas'}
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
  matchBlock: {
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  matchText: {
    fontSize: typography.size.sm,
    lineHeight: 18,
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
