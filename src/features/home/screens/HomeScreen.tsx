import { JourneyIllustration } from '../components/JourneyIllustration';
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
import {
  AmbientBackground,
  Button,
  Card,
  Skeleton,
  Surface,
} from '../../../shared/components/ui-v2';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { IconContainer } from '../../../shared/components/ui/IconButton';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
import { unregisterTripNotifications } from '../../ride-runtime/pushRegistration';
import { bookingApi } from '../../ride/api/bookingApi';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useRecentRides } from '../hooks/useRecentRides';
import { useActiveRide, ActiveRideInfo } from '../hooks/useActiveRide';
import { RecentRidesTable } from '../components/RecentRidesTable';
import type { MainStackParamList } from '../../../app/navigation/MainNavigator';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type BannerTarget = {
  [K in keyof MainStackParamList]: { name: K; params: MainStackParamList[K] };
}[keyof MainStackParamList];

interface BannerConfig {
  iconName: string;
  text: string;
  target: BannerTarget;
}

function getBannerConfig(activeRide: ActiveRideInfo): BannerConfig {
  const { role, status, rideId } = activeRide;
  const inProgress = status === 'in_progress';

  if (role === 'driver') {
    if (inProgress) {
      return {
        iconName: 'navigation',
        text: 'Viaje en curso · Continuar',
        target: { name: 'DriverActiveRide', params: { rideId } },
      };
    }
    return {
      iconName: 'campaign',
      text: 'Tienes un viaje publicado · Ver solicitudes',
      target: { name: 'RideScheduled', params: { rideId } },
    };
  }

  if (inProgress) {
    return {
      iconName: 'directions-car',
      text: 'Tu viaje está en camino · Ver estado',
      target: { name: 'PassengerActiveRide', params: { rideId } },
    };
  }
  return {
    iconName: 'pending-actions',
    text: 'Tienes una reserva pendiente · Ver detalles',
    target: { name: 'RideScheduled', params: { rideId } },
  };
}

const RECENT_RIDES_LIMIT = 5;

export const HomeScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  const {
    user,
    loading: userLoading,
    error: userError,
    reload: reloadUser,
  } = useCurrentUserRole();

  const { activeRide } = useActiveRide();

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
  // conductor. Se mantiene como una micro-query inline porque las pantallas
  // dedicadas (`RideScheduledScreen`) ya operan por `ride_id` específico.
  // RLS `bookings_select_parties` ya restringe la visibilidad al conductor.
  // El `driver_profiles.driver_id` viene resuelto desde `useCurrentUserRole`,
  // por eso este efecto arranca directo en el query de `rides` sin re-leer
  // `driver_profiles`.
  const driverProfileId = user?.role === 'conductor' ? user.driverId : null;
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingTick, setPendingTick] = useState(0);
  const reloadPending = useCallback(() => setPendingTick(t => t + 1), []);

  useEffect(() => {
    let active = true;
    if (!driverProfileId) {
      setPendingCount(0);
      return;
    }

    (async () => {
      try {
        const { count } = await bookingApi.pendingCount();
        if (!active) return;
        setPendingCount(count);
      } catch {
        // Cualquier error inesperado: degradar a 0, nunca crashear el Home.
        if (active) setPendingCount(0);
      }
    })();

    return () => {
      active = false;
    };
  }, [driverProfileId, pendingTick]);

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
    await unregisterTripNotifications().catch(() => undefined);
    const { error } = await sessionAdapter.signOut();
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
      if (!user.canPublishRides) {
        Alert.alert(
          'Perfil pendiente',
          'Tu perfil de conductor debe estar aprobado antes de publicar viajes.',
        );
        return;
      }
      navigation.navigate('PublishRide');
    }
  };

  const handleBannerPress = useCallback(() => {
    if (!activeRide) return;
    const cfg = getBannerConfig(activeRide);
    navigation.navigate(cfg.target.name, cfg.target.params as never);
  }, [activeRide, navigation]);

  const bannerConfig = activeRide ? getBannerConfig(activeRide) : null;

  if (userLoading && !user) {
    return (
      <View
        style={[
          styles.fallback,
          { paddingTop: insets.top, backgroundColor: theme.colors.background },
        ]}
        accessibilityLabel="Cargando inicio"
      >
        <Skeleton width="50%" height={28} />
        <Skeleton height={120} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  if (userError && !user) {
    return (
      <View
        style={[
          styles.fallback,
          { paddingTop: insets.top, backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialIcons
          name="error-outline"
          size={32}
          color={colors.status.error}
        />
        <Text style={styles.fallbackErrorText}>{userError}</Text>
        <View style={styles.fallbackActions}>
          <Button title="Reintentar" onPress={reloadUser} style={{ marginBottom: spacing.md }} />
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
  const roleLabel = isPassenger ? 'Pasajero' : 'Conductor';

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AmbientBackground />
      <View
        style={[styles.headerWrap, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.greeting, { color: theme.colors.textSecondary }]}
            >
              Hola,
            </Text>
            <Text
              style={[styles.userName, { color: theme.colors.textPrimary }]}
            >
              {user.displayName}
            </Text>
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

        {bannerConfig && (
          <Card
            variant="filled"
            radius="lg"
            padding="md"
            onPress={handleBannerPress}
            style={styles.banner}
            contentStyle={styles.bannerRow}
          >
            <IconContainer size="sm" style={styles.bannerIcon}>
              <MaterialIcons
                name={bannerConfig.iconName}
                size={20}
                color={theme.colors.primary}
              />
            </IconContainer>
            <Text
              style={[styles.bannerText, { color: theme.colors.primary }]}
              numberOfLines={2}
            >
              {bannerConfig.text}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={theme.colors.primary}
            />
          </Card>
        )}
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.lg,
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
        <Surface
          elevation={3}
          radius={32}
          style={styles.ctaCard}
          contentStyle={{ padding: spacing.lg }}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 2,
              marginBottom: 16,
            }}
          >
            KROW · COMPARTE EL CAMINO
          </Text>
          <JourneyIllustration />
          <Text style={[styles.ctaTitle, { color: theme.colors.textPrimary }]}>
            {isPassenger
              ? 'Tu siguiente destino,\njuntos.'
              : 'Un camino.\nMás compañía.'}
          </Text>
          <Text
            style={[styles.ctaSubtitle, { color: theme.colors.textSecondary }]}
          >
            {isPassenger
              ? 'Encuentra estudiantes que vayan en tu misma dirección y comparte el viaje.'
              : 'Publica tu viaje y deja que otros estudiantes reserven asientos.'}
          </Text>
          <Button
            title={
              !isPassenger && !user.canPublishRides
                ? 'Aprobación pendiente'
                : primaryActionTitle
            }
            onPress={handlePrimaryAction}
            disabled={!isPassenger && !user.canPublishRides}
          />
          {!isPassenger && !user.canPublishRides && (
            <Text
              style={[
                styles.approvalHint,
                { color: theme.colors.textSecondary },
              ]}
            >
              Administración debe aprobar tu perfil antes de que puedas
              publicar.
            </Text>
          )}
        </Surface>

        {!isPassenger && (
          <View style={styles.driverTools}>
            <Button
              title="Mis viajes"
              variant="outline"
              leftIcon={
                <MaterialIcons
                  name="commute"
                  size={20}
                  color={theme.colors.primary}
                />
              }
              onPress={() => navigation.navigate('DriverTrips')}
            />
            <Button
              title="Rutas frecuentes"
              variant="outline"
              leftIcon={
                <MaterialIcons
                  name="route"
                  size={20}
                  color={theme.colors.primary}
                />
              }
              onPress={() => navigation.navigate('FavoriteRoutes')}
            />
          </View>
        )}

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
              <Text style={styles.requestsTitle}>Solicitudes pendientes</Text>
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
            <Text
              style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
            >
              Viajes recientes
            </Text>
            <Text
              style={[styles.sectionHint, { color: theme.colors.textMuted }]}
            >
              Últimos {RECENT_RIDES_LIMIT}
            </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  banner: {
    marginTop: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    backgroundColor: '#FFFFFF',
    marginRight: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
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
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
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
  approvalHint: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
  driverTools: {
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
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
