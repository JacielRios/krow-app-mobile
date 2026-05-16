import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { setSkipSplashOnNextAuthMount } from '../../../app/authEntryPreference';
import { clearSessionLoginMode } from '../../../app/sessionLoginMode';
import { colors } from '../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../shared/theme/tokens';
import { Button } from '../../../shared/components/ui/Button';
import { supabase } from '../../../services/supabase';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useRecentRides } from '../hooks/useRecentRides';
import { useActiveRide } from '../../../app/store/activeRideStore';
import type { RecentRide } from '../hooks/useRecentRides';
import { HomeRidesListBlock } from '../components/HomeRidesListBlock';

const RECENT_RIDES_LIMIT = 10;

// ─── Componente HomeScreen ─────────────────────────────────────────
export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  const { user, loading: userLoading, error: userError, reload: reloadUser } =
    useCurrentUserRole();
  const activeRide = useActiveRide();

  // Si hay un viaje en curso persistido, redirige a la pantalla activa.
  // Solo redirige si el rol almacenado coincide con el rol actual del usuario.
  useEffect(() => {
    if (!activeRide.hydrated || !user) return;
    if (
      activeRide.rideId &&
      activeRide.status === 'in_progress' &&
      activeRide.role
    ) {
      // Si el rol almacenado no coincide con el usuario actual, limpiar
      if (activeRide.role !== user.role) {
        activeRide.clearActive();
        return;
      }
      const target =
        activeRide.role === 'conductor'
          ? 'DriverActiveRide'
          : 'PassengerActiveRide';
      navigation.navigate(target, { rideId: activeRide.rideId });
    }
  }, [
    activeRide.hydrated,
    activeRide.rideId,
    activeRide.status,
    activeRide.role,
    activeRide.clearActive,
    user,
    navigation,
  ]);

  const handleRidePress = useCallback(
    (ride: RecentRide) => {
      if (!user) return;
      const isPassenger = user.role === 'pasajero';
      if (ride.status === 'in_progress') {
        navigation.navigate(
          isPassenger ? 'PassengerActiveRide' : 'DriverActiveRide',
          { rideId: ride.rideId },
        );
      } else if (ride.status === 'completed' || ride.status === 'cancelled') {
        navigation.navigate(
          isPassenger ? 'PassengerFinishedRide' : 'DriverFinishedRide',
          { rideId: ride.rideId },
        );
      } else if (
        !isPassenger &&
        (ride.status === 'scheduled' || ride.status === 'open' || ride.status === 'full')
      ) {
        navigation.navigate('RideRequests', { rideId: ride.rideId });
      }
    },
    [user, navigation],
  );

  const {
    rides,
    loading: ridesLoading,
    error: ridesError,
    notice: ridesNotice,
    reload: reloadRides,
  } = useRecentRides(user?.role ?? null, user?.userId ?? null, {
    limit: RECENT_RIDES_LIMIT,
  });

  // Pending bookings count for drivers
  const driverUserId = user?.role === 'conductor' ? user.userId : null;
  const [pendingCount, setPendingCount] = useState(0);
  const [firstPendingRideId, setFirstPendingRideId] = useState<string | null>(null);
  const [pendingTick, setPendingTick] = useState(0);
  const reloadPending = useCallback(() => setPendingTick(t => t + 1), []);

  useEffect(() => {
    let active = true;
    if (!driverUserId) {
      setPendingCount(0);
      setFirstPendingRideId(null);
      return;
    }

    (async () => {
      try {
        const { data: driverRow, error: driverError } = await supabase
          .from('driver_profiles')
          .select('driver_id')
          .eq('user_id', driverUserId)
          .maybeSingle();

        if (!active) return;
        if (driverError || !driverRow?.driver_id) {
          setPendingCount(0);
          setFirstPendingRideId(null);
          return;
        }

        const { data: ridesData, error: ridesError2 } = await supabase
          .from('rides')
          .select('ride_id')
          .eq('driver_id', driverRow.driver_id);

        if (!active) return;
        if (ridesError2) {
          setPendingCount(0);
          setFirstPendingRideId(null);
          return;
        }

        const rideIds = (ridesData ?? [])
          .map(r => r?.ride_id)
          .filter((id): id is string => typeof id === 'string');

        if (rideIds.length === 0) {
          setPendingCount(0);
          setFirstPendingRideId(null);
          return;
        }

        const { count, error: countError } = await supabase
          .from('bookings')
          .select('booking_id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('ride_id', rideIds);

        if (!active) return;
        if (countError) {
          setPendingCount(0);
          setFirstPendingRideId(null);
          return;
        }
        setPendingCount(count ?? 0);

        if ((count ?? 0) > 0) {
          const { data: firstBooking } = await supabase
            .from('bookings')
            .select('ride_id')
            .eq('status', 'pending')
            .in('ride_id', rideIds)
            .limit(1)
            .maybeSingle();
          if (active) {
            setFirstPendingRideId(firstBooking?.ride_id ?? null);
          }
        } else {
          setFirstPendingRideId(null);
        }
      } catch {
        if (active) {
          setPendingCount(0);
          setFirstPendingRideId(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [driverUserId, pendingTick]);

  useFocusEffect(
    useCallback(() => {
      reloadUser();
      reloadPending();
    }, [reloadUser, reloadPending]),
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
  const primaryActionTitle = isPassenger ? 'Buscar un ride' : 'Crear viaje';
  const primaryActionIcon = isPassenger ? 'search' : 'add-circle-outline';

  return (
    <View style={styles.screen}>
      {/* ─── Header Gradient ────────────────────────────────── */}
      <View style={[styles.headerBg, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Hola, {user.displayName?.split(' ')[0]} 👋
            </Text>
            <View style={styles.rolePill}>
              <View
                style={[
                  styles.roleDot,
                  { backgroundColor: isPassenger ? '#60A5FA' : '#34D399' },
                ]}
              />
              <Text style={styles.roleText}>
                {isPassenger ? 'Pasajero' : 'Conductor'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <MaterialIcons name="logout" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={ridesLoading}
            onRefresh={reloadRides}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero CTA Card ──────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialIcons
              name={primaryActionIcon}
              size={28}
              color={colors.surface}
            />
          </View>
          <Text style={styles.heroTitle}>
            {isPassenger
              ? 'Encuentra ride en segundos'
              : '¿Tienes lugares disponibles?'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isPassenger
              ? 'Viaja de forma rápida, segura y fácil con otros estudiantes.'
              : 'Publica tu viaje y comparte el camino con tu comunidad.'}
          </Text>
          <Button
            title={primaryActionTitle}
            onPress={handlePrimaryAction}
            leftIcon={
              <MaterialIcons name={primaryActionIcon} size={20} color={colors.text.inverse} />
            }
          />
        </View>

        {/* ─── Pending Requests Banner ────────────────────── */}
        {!isPassenger && pendingCount > 0 && (
          <TouchableOpacity
            style={styles.pendingCard}
            activeOpacity={0.7}
            onPress={() => {
              if (firstPendingRideId) {
                navigation.navigate('RideRequests', { rideId: firstPendingRideId });
              }
            }}
          >
            <View style={styles.pendingLeft}>
              <View style={styles.pendingIconWrap}>
                <MaterialIcons name="mark-email-unread" size={22} color={colors.surface} />
              </View>
              <View style={styles.pendingTextWrap}>
                <Text style={styles.pendingTitle}>
                  Solicitudes pendientes
                </Text>
                <Text style={styles.pendingSubtitle}>
                  {`${pendingCount} pasajero${
                    pendingCount === 1 ? '' : 's'
                  } esperando tu respuesta`}
                </Text>
              </View>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          </TouchableOpacity>
        )}

        <HomeRidesListBlock
          rides={rides}
          ridesLoading={ridesLoading}
          ridesError={ridesError}
          ridesNotice={ridesNotice}
          isPassenger={isPassenger}
          recentRidesLimit={RECENT_RIDES_LIMIT}
          onRidePress={handleRidePress}
        />
      </ScrollView>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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

  // ── Header ─────────────────────────────────────────
  headerBg: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    borderBottomLeftRadius: radii.sheet,
    borderBottomRightRadius: radii.sheet,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs + 2,
  },
  roleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ─────────────────────────────────────────
  scrollContainer: {
    flex: 1,
    marginTop: -(spacing.xl),
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // ── Hero Card ──────────────────────────────────────
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // ── Pending Card ───────────────────────────────────
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.status.warning,
    ...shadows.md,
  },
  pendingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.status.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pendingTextWrap: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  pendingSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: colors.status.error,
    borderRadius: radii.full,
    minWidth: 26,
    height: 26,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  pendingBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
});
