import { depth, glass } from '../../../shared/theme/materials';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { StatusBadge, BadgeStatus } from '../../../shared/components/ui';
import { SessionLoginMode } from '../../../app/sessionLoginMode';
import { RecentRide, RecentRideStatus } from '../hooks/useRecentRides';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Skeleton } from '../../../shared/components/ui-v2';
import { money, rideDate } from '../../../shared/format';

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
  full: 'full',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

const formatPrice = (price: number | null): string => {
  if (price == null) return '—';
  return `${money(Math.round(price * 100))} MXN`;
};

const RideRow: React.FC<{
  ride: RecentRide;
  onPress?: () => void;
  index: number;
}> = ({ ride, index, onPress }) => {
  const { theme, motionEnabled } = useTheme();
  return (
    <Animated.View
      entering={
        motionEnabled && index < 8
          ? FadeInDown.duration(200).delay(index * 35)
          : undefined
      }
      layout={motionEnabled ? LinearTransition.duration(200) : undefined}
      style={[styles.row, glass(theme), depth(theme, 1), { borderRadius: 24 }]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View style={styles.rowHeader}>
          <Text style={[styles.rowDate, { color: theme.colors.textPrimary }]}>
            {rideDate(ride.departureTime)}
          </Text>
          <StatusBadge status={STATUS_TO_BADGE[ride.status]} size="sm" />
        </View>

        <View style={styles.routeContainer}>
          <MaterialIcons
            name="trip-origin"
            size={14}
            color={theme.colors.primary}
            style={styles.routeIcon}
          />
          <Text
            style={[styles.routeText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
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
          <Text
            style={[styles.routeText, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {ride.destinationLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons
              name="event-seat"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.metaText, { color: theme.colors.textSecondary }]}
            >
              {ride.seats} asientos
            </Text>
          </View>
          <Text style={[styles.priceText, { color: theme.colors.primary }]}>
            {formatPrice(ride.pricePerSeat)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
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
  const { theme } = useTheme();
  if (loading) {
    return (
      <View
        accessibilityLabel="Cargando viajes"
        style={[
          styles.stateContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Skeleton height={18} width="42%" />
        <Skeleton height={14} style={{ marginTop: spacing.md }} />
        <Skeleton height={14} width="78%" style={{ marginTop: spacing.sm }} />
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
        <MaterialIcons name="inbox" size={32} color={colors.text.placeholder} />
        <Text style={styles.stateText}>{notice ?? emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rides}
      keyExtractor={item => item.rideId}
      renderItem={({ item, index }) => (
        <RideRow
          ride={item}
          index={index}
          onPress={onPressItem ? () => onPressItem(item) : undefined}
        />
      )}
      ItemSeparatorComponent={RideSeparator}
      scrollEnabled={false}
    />
  );
};

function RideSeparator() {
  return <View style={styles.separator} />;
}
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
