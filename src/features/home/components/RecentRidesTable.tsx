import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { StatusBadge, BadgeStatus } from '../../../shared/components/ui';
import { SessionLoginMode } from '../../../app/sessionLoginMode';
import { RecentRide, RecentRideStatus } from '../hooks/useRecentRides';

interface Props {
  rides: RecentRide[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  role: SessionLoginMode;
  onPressItem?: (ride: RecentRide) => void;
}

const STATUS_TO_BADGE: Record<RecentRideStatus, BadgeStatus> = {
  scheduled: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
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

const RideRow: React.FC<{
  ride: RecentRide;
  onPress?: () => void;
}> = ({ ride }) => {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowDate}>{formatDate(ride.departureTime)}</Text>
        <StatusBadge status={STATUS_TO_BADGE[ride.status]} size="sm" />
      </View>

      <View style={styles.routeContainer}>
        <MaterialIcons
          name="trip-origin"
          size={14}
          color={colors.primary}
          style={styles.routeIcon}
        />
        <Text style={styles.routeText} numberOfLines={1}>
          {ride.originLabel}
        </Text>
      </View>
      <View style={styles.routeContainer}>
        <MaterialIcons
          name="place"
          size={14}
          color={colors.status.error}
          style={styles.routeIcon}
        />
        <Text style={styles.routeText} numberOfLines={1}>
          {ride.destinationLabel}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialIcons
            name="event-seat"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={styles.metaText}>{ride.seats} asientos</Text>
        </View>
        <Text style={styles.priceText}>{formatPrice(ride.pricePerSeat)}</Text>
      </View>
    </View>
  );
};

export const RecentRidesTable: React.FC<Props> = ({
  rides,
  loading,
  error,
  notice,
  role,
  onPressItem,
}) => {
  if (loading) {
    return (
      <View style={[styles.stateContainer, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.stateText}>Cargando viajes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <MaterialIcons
          name="error-outline"
          size={28}
          color={colors.status.error}
        />
        <Text style={styles.stateTextError}>{error}</Text>
      </View>
    );
  }

  if (rides.length === 0) {
    const emptyMessage =
      role === 'pasajero'
        ? 'Aún no has solicitado ningún viaje.'
        : 'Aún no has creado ningún viaje.';
    return (
      <View style={styles.stateContainer}>
        <MaterialIcons
          name="inbox"
          size={32}
          color={colors.text.placeholder}
        />
        <Text style={styles.stateText}>{notice ?? emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rides}
      keyExtractor={item => item.rideId}
      renderItem={({ item }) => (
        <RideRow ride={item} onPress={() => onPressItem?.(item)} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowDate: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeIcon: {
    marginRight: spacing.sm,
  },
  routeText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  metaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  priceText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  separator: {
    height: spacing.sm,
  },
  stateContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  loadingContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
  },
  stateText: {
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stateTextError: {
    marginTop: spacing.sm,
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },
});
