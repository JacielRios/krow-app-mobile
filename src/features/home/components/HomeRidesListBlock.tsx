import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../shared/theme/tokens';
import type { RecentRide } from '../hooks/useRecentRides';

const STATUS_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  scheduled: { label: 'Programado', bg: colors.status.infoLight, fg: '#1D4ED8' },
  open: { label: 'Abierto', bg: colors.status.infoLight, fg: '#1D4ED8' },
  full: { label: 'Completo', bg: colors.status.warningLight, fg: '#92400E' },
  in_progress: { label: 'En viaje', bg: colors.status.infoLight, fg: '#1D4ED8' },
  completed: { label: 'Completado', bg: colors.status.successLight, fg: '#166534' },
  cancelled: { label: 'Cancelado', bg: '#F1F5F9', fg: '#64748B' },
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (price: number | null): string => {
  if (price == null) return '—';
  return `$${price.toFixed(0)} MXN`;
};

export interface HomeRidesListBlockProps {
  rides: RecentRide[];
  ridesLoading: boolean;
  ridesError: string | null;
  ridesNotice: string | null;
  isPassenger: boolean;
  recentRidesLimit: number;
  onRidePress: (ride: RecentRide) => void;
}

/**
 * Bloque aislado de lista de viajes (home). Evita mezclar condicionales con el
 * resto de la pantalla y facilita memoizar el árbol que depende solo de `rides`.
 */
export const HomeRidesListBlock = memo(function HomeRidesListBlock({
  rides,
  ridesLoading,
  ridesError,
  ridesNotice,
  isPassenger,
  recentRidesLimit,
  onRidePress,
}: HomeRidesListBlockProps) {
  const renderRideCard = useCallback(
    (ride: RecentRide) => {
      const statusInfo = STATUS_LABELS[ride.status] ?? STATUS_LABELS.open;
      return (
        <TouchableOpacity
          key={ride.rideId}
          style={styles.rideCard}
          activeOpacity={0.7}
          onPress={() => onRidePress(ride)}
        >
          <View style={[styles.rideStatusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.rideStatusText, { color: statusInfo.fg }]}>
              {statusInfo.label}
            </Text>
          </View>

          <View style={styles.rideRouteRow}>
            <Text style={styles.rideRouteText} numberOfLines={1}>
              {ride.originLabel}
            </Text>
            <Text style={styles.rideArrow}> → </Text>
            <Text style={styles.rideRouteText} numberOfLines={1}>
              {ride.destinationLabel}
            </Text>
          </View>

          <View style={styles.rideMetaRow}>
            <Text style={styles.rideMetaText}>{formatDate(ride.departureTime)}</Text>
            <Text style={styles.rideMetaDot}>·</Text>
            <Text style={styles.rideMetaText}>
              {ride.seats} lugar{ride.seats === 1 ? '' : 'es'}
            </Text>
          </View>

          <View style={styles.ridePriceRow}>
            <Text style={styles.ridePriceText}>{formatPrice(ride.pricePerSeat)}</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>
      );
    },
    [onRidePress],
  );

  if (ridesLoading && rides.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Cargando viajes…</Text>
        </View>
      </View>
    );
  }

  if (ridesError) {
    return (
      <View style={styles.section}>
        <View style={styles.emptyCard}>
          <MaterialIcons name="error-outline" size={24} color={colors.status.error} />
          <Text style={[styles.emptyText, { color: colors.status.error }]}>{ridesError}</Text>
        </View>
      </View>
    );
  }

  if (rides.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tus viajes</Text>
        </View>
        <View style={styles.emptyCard}>
          <MaterialIcons name="directions-car" size={40} color={colors.text.muted} />
          <Text style={styles.emptyText}>
            {ridesNotice ??
              (isPassenger
                ? 'Aún no has solicitado ningún viaje.'
                : 'Aún no has creado ningún viaje.')}
          </Text>
        </View>
      </View>
    );
  }

  if (!isPassenger) {
    const activeRides = rides.filter(
      r =>
        r.status === 'scheduled' ||
        r.status === 'open' ||
        r.status === 'full' ||
        r.status === 'in_progress',
    );
    const pastRides = rides.filter(
      r => r.status === 'completed' || r.status === 'cancelled',
    );

    return (
      <>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Viajes activos</Text>
            {activeRides.length > 0 && (
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>{activeRides.length}</Text>
              </View>
            )}
          </View>
          {activeRides.length === 0 ? (
            <View style={styles.emptyCardSmall}>
              <Text style={styles.emptyTextSmall}>
                No tienes viajes activos en este momento.
              </Text>
            </View>
          ) : (
            activeRides.map(renderRideCard)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Historial</Text>
            {pastRides.length > 0 && (
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>{pastRides.length}</Text>
              </View>
            )}
          </View>
          {pastRides.length === 0 ? (
            <View style={styles.emptyCardSmall}>
              <Text style={styles.emptyTextSmall}>Aún no has completado viajes.</Text>
            </View>
          ) : (
            pastRides.map(renderRideCard)
          )}
        </View>
      </>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tus viajes</Text>
        <Text style={styles.sectionHint}>Últimos {recentRidesLimit}</Text>
      </View>
      {rides.map(renderRideCard)}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sectionHint: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  sectionCountPill: {
    backgroundColor: colors.status.infoLight,
    borderRadius: radii.full,
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: '#1D4ED8',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.sm,
    ...shadows.sm,
  },
  emptyText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyCardSmall: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTextSmall: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  rideCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rideStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  rideStatusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  rideRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rideRouteText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flexShrink: 1,
  },
  rideArrow: {
    fontSize: typography.size.lg,
    color: colors.text.tertiary,
    marginHorizontal: 2,
  },
  rideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rideMetaText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  rideMetaDot: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  ridePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ridePriceText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});
