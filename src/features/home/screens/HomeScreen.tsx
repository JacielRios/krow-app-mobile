import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { setSkipSplashOnNextAuthMount } from '../../../app/authEntryPreference';
import { clearSessionLoginMode } from '../../../app/sessionLoginMode';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { Button } from '../../../shared/components/ui/Button';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { supabase } from '../../../services/supabase';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useRecentRides } from '../hooks/useRecentRides';
import { RecentRidesTable } from '../components/RecentRidesTable';

const RECENT_RIDES_LIMIT = 5;

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  const { user, loading: userLoading, error: userError, reload: reloadUser } =
    useCurrentUserRole();

  const {
    rides,
    loading: ridesLoading,
    error: ridesError,
    notice: ridesNotice,
    reload: reloadRides,
  } = useRecentRides(user?.role ?? null, user?.userId ?? null, {
    limit: RECENT_RIDES_LIMIT,
  });

  // Contador agregado de solicitudes pendientes sobre TODOS los rides del
  // conductor. Se queda como una micro-query inline porque `usePendingBookings`
  // ahora opera por `ride_id` (lo usan las pantallas dedicadas).
  // RLS `bookings_select_parties` ya restringe la visibilidad al conductor.
  const driverUserId = user?.role === 'conductor' ? user.userId : null;
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingTick, setPendingTick] = useState(0);
  const reloadPending = useCallback(() => setPendingTick(t => t + 1), []);

  useEffect(() => {
    let active = true;
    if (!driverUserId) {
      setPendingCount(0);
      return;
    }

    (async () => {
      try {
        // 1) driver_profile del usuario actual
        const { data: driverRow, error: driverError } = await supabase
          .from('driver_profiles')
          .select('driver_id')
          .eq('user_id', driverUserId)
          .maybeSingle();

        if (!active) return;
        if (driverError || !driverRow?.driver_id) {
          setPendingCount(0);
          return;
        }

        // 2) Rides publicados por este conductor.
        // Hacemos dos queries independientes en lugar de un join embebido para
        // evitar la combinación frágil de `ride.driver_id` filter + head:true.
        const { data: ridesData, error: ridesError } = await supabase
          .from('rides')
          .select('ride_id')
          .eq('driver_id', driverRow.driver_id);

        if (!active) return;
        if (ridesError) {
          setPendingCount(0);
          return;
        }

        const rideIds = (ridesData ?? [])
          .map(r => r?.ride_id)
          .filter((id): id is string => typeof id === 'string');

        if (rideIds.length === 0) {
          setPendingCount(0);
          return;
        }

        // 3) Conteo de bookings pendientes sobre esos rides.
        const { count, error: countError } = await supabase
          .from('bookings')
          .select('booking_id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('ride_id', rideIds);

        if (!active) return;
        if (countError) {
          setPendingCount(0);
          return;
        }
        setPendingCount(count ?? 0);
      } catch {
        // Cualquier error inesperado: degradar a 0, nunca crashear el Home.
        if (active) setPendingCount(0);
      }
    })();

    return () => {
      active = false;
    };
  }, [driverUserId, pendingTick]);

  useFocusEffect(
    useCallback(() => {
      reloadUser();
      reloadRides();
      reloadPending();
    }, [reloadUser, reloadRides, reloadPending]),
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    setSkipSplashOnNextAuthMount(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      await clearSessionLoginMode();
    } else {
      setSkipSplashOnNextAuthMount(false);
      Alert.alert('Error', 'No se pudo cerrar la sesión. Intenta de nuevo.');
    }
    setSigningOut(false);
  };

  const handlePrimaryAction = () => {
    if (!user) return;
    if (user.role === 'pasajero') {
      navigation.navigate('RequestRide');
    } else {
      navigation.navigate('PublishRide');
    }
  };

  if (userLoading && !user) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top }]}>
        <Text style={styles.fallbackText}>Cargando…</Text>
      </View>
    );
  }

  if (userError && !user) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top }]}>
        <MaterialIcons
          name="error-outline"
          size={32}
          color={colors.status.error}
        />
        <Text style={styles.fallbackErrorText}>{userError}</Text>
        <View style={styles.fallbackActions}>
          <Button
            title="Cerrar sesión"
            variant="outline"
            onPress={handleSignOut}
            loading={signingOut}
          />
        </View>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const isPassenger = user.role === 'pasajero';
  const primaryActionTitle = isPassenger ? 'Solicitar viaje' : 'Crear viaje';
  const primaryActionIcon = isPassenger ? 'directions-car' : 'add-road';
  const roleLabel = isPassenger ? 'Pasajero' : 'Conductor';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={ridesLoading}
          onRefresh={reloadRides}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.userName}>{user.displayName}</Text>
          <View style={styles.badgeWrap}>
            <StatusBadge
              tone={isPassenger ? 'info' : 'primary'}
              label={roleLabel}
              size="sm"
            />
          </View>
        </View>
        <Button
          title="Salir"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={handleSignOut}
          loading={signingOut}
          contentStyle={styles.signOutContent}
        />
      </View>

      <View style={styles.ctaCard}>
        <View style={styles.ctaIconWrap}>
          <MaterialIcons
            name={primaryActionIcon}
            size={28}
            color={colors.primary}
          />
        </View>
        <Text style={styles.ctaTitle}>
          {isPassenger
            ? '¿Necesitas trasladarte?'
            : '¿Vas a salir y tienes lugares?'}
        </Text>
        <Text style={styles.ctaSubtitle}>
          {isPassenger
            ? 'Encuentra estudiantes que vayan en tu misma dirección y comparte el viaje.'
            : 'Publica tu viaje y deja que otros estudiantes reserven asientos.'}
        </Text>
        <Button title={primaryActionTitle} onPress={handlePrimaryAction} />
      </View>

      {!isPassenger && pendingCount > 0 && (
        <View style={styles.requestsCard}>
          <View style={styles.requestsIconWrap}>
            <MaterialIcons
              name="mark-email-unread"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.requestsTextWrap}>
            <Text style={styles.requestsTitle}>
              Solicitudes pendientes
            </Text>
            <Text style={styles.requestsSubtitle}>
              {`${pendingCount} pasajero${
                pendingCount === 1 ? '' : 's'
              } esperando respuesta en tus viajes publicados`}
            </Text>
          </View>
          <View style={styles.requestsBadge}>
            <Text style={styles.requestsBadgeText}>{pendingCount}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Viajes recientes</Text>
          <Text style={styles.sectionHint}>Últimos {RECENT_RIDES_LIMIT}</Text>
        </View>
        <RecentRidesTable
          rides={rides}
          loading={ridesLoading}
          error={ridesError}
          notice={ridesNotice}
          role={user.role}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fallbackText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  fallbackErrorText: {
    marginTop: spacing.md,
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },
  fallbackActions: {
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  badgeWrap: {
    marginTop: spacing.sm,
  },
  signOutContent: {
    paddingHorizontal: spacing.sm,
  },
  ctaCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.xl,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ctaTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  requestsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  requestsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requestsTextWrap: {
    flex: 1,
  },
  requestsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  requestsSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  requestsBadge: {
    backgroundColor: colors.status.error,
    borderRadius: radii.full,
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  requestsBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
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
    color: colors.text.muted,
  },
});
