import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { Button } from '../../../../shared/components/ui/Button';
import { RoutePreviewMap } from '../../../maps';
import {
  useCancelRide,
  useCompleteRide,
  useCompleteStop,
  useDriverLocationBroadcast,
  useFakeDriverLocation,
  useRideRealtime,
} from '../../hooks';
import { activeRideStore } from '../../../../app/store/activeRideStore';
import { supabase } from '../../../../services/supabase';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import type { BookingRequest } from '../../types/booking.types';

const { height: SCREEN_H } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_H * 0.38;

interface RideCoords {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  routePolyline: string | null;
}

type RouteProp = NativeStackScreenProps<
  MainStackParamList,
  'DriverActiveRide'
>['route'];
type Nav = NativeStackNavigationProp<MainStackParamList, 'DriverActiveRide'>;

// Avatar initial with color rotation
const getAvatarColor = (index: number) =>
  colors.avatarColors[index % colors.avatarColors.length];

export const DriverActiveRideScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const rideId = route.params?.rideId ?? null;

  const { ride, bookings, loading, error, realtimeStatus } =
    useRideRealtime(rideId);

  const { completeRide, loading: completing } = useCompleteRide();
  const { cancelRide, loading: cancelling } = useCancelRide();
  const { completeStop, loading: completingStop } = useCompleteStop();

  const activePassengers = useMemo(
    () =>
      bookings.filter(
        b => b.status === 'confirmed' || b.status === 'in_progress',
      ),
    [bookings],
  );

  const completedPassengers = useMemo(
    () => bookings.filter(b => b.status === 'completed'),
    [bookings],
  );

  const allStopsCompleted =
    activePassengers.length === 0 && completedPassengers.length > 0;

  const totalEarnings = useMemo(() => {
    const confirmed = bookings.filter(
      b =>
        b.status === 'confirmed' ||
        b.status === 'in_progress' ||
        b.status === 'completed',
    );
    if (!ride?.pricePerSeat) return null;
    return confirmed.reduce(
      (acc, b) => acc + (ride.pricePerSeat ?? 0) * b.seatsReserved,
      0,
    );
  }, [bookings, ride?.pricePerSeat]);

  // Coords & polyline
  const [coords, setCoords] = useState<RideCoords | null>(null);
  useEffect(() => {
    if (!rideId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select(
          'origin_lat, origin_lng, destination_lat, destination_lng, route_polyline',
        )
        .eq('ride_id', rideId)
        .maybeSingle();
      if (!active || !data) return;
      setCoords({
        originLat: Number(data.origin_lat),
        originLng: Number(data.origin_lng),
        destLat: Number(data.destination_lat),
        destLng: Number(data.destination_lng),
        routePolyline: data.route_polyline,
      });
    })();
    return () => { active = false; };
  }, [rideId]);

  const fakeLocation = useFakeDriverLocation({
    routePolyline: coords?.routePolyline ?? null,
    origin: coords
      ? { lat: coords.originLat, lng: coords.originLng }
      : { lat: 0, lng: 0 },
    destination: coords
      ? { lat: coords.destLat, lng: coords.destLng }
      : { lat: 0, lng: 0 },
    active: ride?.status === 'in_progress' && coords != null,
  });

  useDriverLocationBroadcast({
    rideId: ride?.status === 'in_progress' ? rideId : null,
    location: fakeLocation,
  });

  // Auto-navigate on completion
  useEffect(() => {
    if (ride?.status === 'completed') {
      activeRideStore.clear();
      navigation.replace('DriverFinishedRide', { rideId: ride.rideId });
    }
  }, [ride?.status, ride?.rideId, navigation]);

  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);

  const handleCompleteStop = (booking: BookingRequest) => {
    if (completingStop || completingBookingId) return;
    Alert.alert(
      'Completar parada',
      `¿${booking.passenger.fullName ?? 'El pasajero'} llegó a su destino?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, llegó',
          onPress: async () => {
            setCompletingBookingId(booking.bookingId);
            const { success, error: err } = await completeStop(booking.bookingId);
            setCompletingBookingId(null);
            if (!success) Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
          },
        },
      ],
    );
  };

  const handleComplete = () => {
    if (!ride) return;
    Alert.alert('Finalizar viaje', '¿Confirmas que el viaje ha terminado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          const { success, error: err } = await completeRide(ride.rideId);
          if (!success) {
            Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
            return;
          }
          activeRideStore.clear();
          navigation.replace('DriverFinishedRide', { rideId: ride.rideId });
        },
      },
    ]);
  };

  const handleCancel = () => {
    if (!ride) return;
    Alert.alert(
      'Cancelar viaje',
      'Todas las reservas activas serán canceladas. ¿Continuar?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancelar viaje',
          style: 'destructive',
          onPress: async () => {
            const { success, error: err } = await cancelRide(ride.rideId, 'driver_action');
            if (!success) {
              Alert.alert('Error', err ?? 'Inténtalo de nuevo.');
              return;
            }
            activeRideStore.clear();
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  // ─── Loading / Error ───────────────────────────────────────────────
  if (loading && !ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.mutedText}>Cargando viaje…</Text>
      </View>
    );
  }

  if (error || !ride) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={32} color={colors.status.error} />
        <Text style={styles.errorText}>{error ?? 'No se encontró el viaje.'}</Text>
        <Button title="Volver" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ─── Map Area ──────────────────────────────── */}
      <View style={[styles.mapArea, { paddingTop: insets.top }]}>
        {coords ? (
          <RoutePreviewMap
            origin={{ lat: coords.originLat, lng: coords.originLng }}
            destination={{ lat: coords.destLat, lng: coords.destLng }}
            encodedPolyline={coords.routePolyline}
            height={MAP_HEIGHT}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <MaterialIcons name="map" size={48} color={colors.text.muted} />
          </View>
        )}

        {/* Floating buttons */}
        <View style={[styles.floatingBtnRow, { top: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.floatingBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          {ride.status === 'in_progress' && (
            <TouchableOpacity
              style={styles.floatingBtnChat}
              onPress={() => navigation.navigate('Chat', { rideId: ride.rideId })}
            >
              <MaterialIcons name="chat" size={22} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Bottom Sheet ──────────────────────────── */}
      <View style={styles.sheet}>
        {/* Pill indicator */}
        <View style={styles.pillWrap}>
          <View style={styles.pill} />
        </View>

        {/* Realtime reconnecting banner */}
        {realtimeStatus === 'reconnecting' && (
          <View style={styles.rtBanner}>
            <ActivityIndicator size="small" color={colors.status.warning} />
            <Text style={styles.rtBannerText}>Reconectando…</Text>
          </View>
        )}

        {/* Destination header */}
        <Text style={styles.destLabel}>DESTINO FINAL</Text>
        <Text style={styles.destName} numberOfLines={2}>
          {ride.destinationAddress ?? 'Destino'}
        </Text>

        {/* Estimated & Total */}
        <View style={styles.statsRow}>
          {totalEarnings != null && (
            <Text style={styles.statTotal}>
              Total: ${totalEarnings.toFixed(0)} MXN
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Passengers header */}
          <Text style={styles.sectionTitle}>
            Pasajeros y paradas ({activePassengers.length + completedPassengers.length})
          </Text>

          {/* Active passengers */}
          {activePassengers.map((p, idx) => (
            <View key={p.bookingId} style={styles.passengerCard}>
              <View style={styles.pRow}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(idx) }]}>
                  <Text style={styles.avatarText}>
                    {(p.passenger.fullName ?? 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pInfo}>
                  <Text style={styles.pName}>
                    {p.passenger.fullName ?? 'Pasajero'}
                  </Text>
                  <View style={styles.pStatusRow}>
                    <View style={styles.pStatusDot} />
                    <Text style={styles.pStatusText}>En viaje</Text>
                  </View>
                </View>
                <Text style={styles.pPrice}>
                  ${((ride.pricePerSeat ?? 0) * p.seatsReserved).toFixed(0)}
                </Text>
              </View>

              {/* Stop address (if we know it from dropoff) */}
              <View style={styles.pStopRow}>
                <MaterialIcons name="place" size={16} color={colors.status.error} />
                <Text style={styles.pStopText} numberOfLines={1}>
                  {ride.destinationAddress ?? 'Destino'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.dropOffBtn}
                onPress={() => handleCompleteStop(p)}
                disabled={completingBookingId !== null}
              >
                <Text style={styles.dropOffText}>
                  {completingBookingId === p.bookingId ? 'Completando…' : 'Dejar aquí'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Completed passengers */}
          {completedPassengers.map((p, idx) => (
            <View key={p.bookingId} style={[styles.passengerCard, styles.completedCard]}>
              <View style={styles.pRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(activePassengers.length + idx) },
                    { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {(p.passenger.fullName ?? 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pInfo}>
                  <Text style={[styles.pName, { color: colors.text.secondary }]}>
                    {p.passenger.fullName ?? 'Pasajero'}
                  </Text>
                  <Text style={styles.completedLabel}>✓ Completado</Text>
                </View>
              </View>
            </View>
          ))}

          {activePassengers.length === 0 && completedPassengers.length > 0 && (
            <View style={styles.allDoneBanner}>
              <MaterialIcons name="check-circle" size={20} color={colors.status.success} />
              <Text style={styles.allDoneText}>
                Todos los pasajeros llegaron a su destino.
              </Text>
            </View>
          )}

          {/* CTA Buttons */}
          <View style={styles.ctaSection}>
            {ride.status === 'in_progress' && allStopsCompleted && (
              <Button
                title={completing ? 'Finalizando…' : 'Finalizar Viaje completo'}
                onPress={handleComplete}
                loading={completing}
                disabled={completing || cancelling}
              />
            )}
            {(ride.status === 'open' ||
              ride.status === 'full' ||
              ride.status === 'in_progress') && (
              <TouchableOpacity
                onPress={handleCancel}
                disabled={cancelling}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>
                  {cancelling ? 'Cancelando…' : 'Cancelar Viaje'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.map.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    rowGap: spacing.md,
  },
  mutedText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },

  // ── Map ─────────────────────────────────
  mapArea: {
    height: MAP_HEIGHT,
    backgroundColor: colors.map.background,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtnRow: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  floatingBtnChat: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  // ── Sheet ───────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    marginTop: -spacing.md,
    ...shadows.xl,
  },
  pillWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
  },
  pill: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.default,
  },
  rtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    backgroundColor: colors.status.warningLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  rtBannerText: {
    fontSize: typography.size.sm,
    color: '#92400E',
  },
  destLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  destName: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  statTotal: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.status.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
  },
  scrollFlex: { flex: 1 },
  scrollInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // ── Passenger Card ──────────────────────
  passengerCard: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  completedCard: {
    opacity: 0.6,
  },
  pRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  pInfo: { flex: 1 },
  pName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  pStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.success,
    marginRight: spacing.xs,
  },
  pStatusText: {
    fontSize: typography.size.sm,
    color: colors.status.success,
    fontWeight: typography.weight.medium,
  },
  pPrice: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  pStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginLeft: spacing.xxl + spacing.xs,
    columnGap: spacing.xs,
  },
  pStopText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  dropOffBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  dropOffText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  completedLabel: {
    fontSize: typography.size.sm,
    color: colors.status.success,
    fontWeight: typography.weight.medium,
    marginTop: 2,
  },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    backgroundColor: colors.status.successLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  allDoneText: {
    flex: 1,
    fontSize: typography.size.md,
    color: '#166534',
    fontWeight: typography.weight.medium,
  },
  ctaSection: {
    marginTop: spacing.md,
    rowGap: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.status.error,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
});
