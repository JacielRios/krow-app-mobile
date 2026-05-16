import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../../../../shared/theme/colors';
import { radii, shadows, spacing, typography } from '../../../../shared/theme/tokens';
import { Button } from '../../../../shared/components/ui/Button';
import { supabase } from '../../../../services/supabase';
import { RoutePreviewMap } from '../../../maps';
import {
  usePassengerRideTracking,
  useUpdateBookingStatus,
} from '../../hooks';
import { activeRideStore } from '../../../../app/store/activeRideStore';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';
import {
  coerceRideStatus,
  type RideStatus,
} from '../../types/ride.types';
import type { BookingStatus } from '../../types/booking.types';

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
  'PassengerActiveRide'
>['route'];
type Nav = NativeStackNavigationProp<
  MainStackParamList,
  'PassengerActiveRide'
>;

interface RideDetail {
  rideId: string;
  status: RideStatus;
  originAddress: string | null;
  destinationAddress: string | null;
  driverName: string | null;
  driverPhoto: string | null;
  driverRating: number | null;
  vehicle: string | null;
  pricePerSeat: number | null;
  myBookingId: string | null;
  myBookingStatus: BookingStatus | null;
  mySeats: number;
}

export const PassengerActiveRideScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const rideId = route.params?.rideId ?? null;

  const [detail, setDetail] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateStatus, loading: cancelling } = useUpdateBookingStatus();

  const tracking = usePassengerRideTracking(rideId);

  // Coords for the map
  const [coords, setCoords] = useState<RideCoords | null>(null);
  useEffect(() => {
    if (!rideId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select('origin_lat, origin_lng, destination_lat, destination_lng, route_polyline')
        .eq('ride_id', rideId)
        .maybeSingle();
      if (!active || !data) return;
      setCoords({
        originLat: Number(data.origin_lat),
        originLng: Number(data.origin_lng),
        destLat: Number(data.destination_lat),
        destLng: Number(data.destination_lng),
        routePolyline: data.route_polyline ?? null,
      });
    })();
    return () => { active = false; };
  }, [rideId]);

  // Load ride + realtime
  useEffect(() => {
    if (!rideId) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const authRes = await supabase.auth.getUser();
        const userId = authRes.data.user?.id ?? null;

        const { data, error: rideError } = await supabase
          .from('rides')
          .select(
            `ride_id, status, origin_address, destination_address, price_per_seat,
             driver:driver_profiles!rides_driver_id_fkey(
               driver_id, rating,
               user:users!driver_profiles_user_id_fkey(full_name, profile_photo)
             ),
             vehicle:vehicles!rides_vehicle_id_fkey(brand, model, license_plate)`,
          )
          .eq('ride_id', rideId)
          .maybeSingle();

        if (!active) return;
        if (rideError) { setError(rideError.message); setLoading(false); return; }
        if (!data) { setError('No se encontró el viaje.'); setLoading(false); return; }

        const r: any = data;
        const driverProfile = Array.isArray(r.driver) ? r.driver[0] : r.driver;
        const driverUser = Array.isArray(driverProfile?.user)
          ? driverProfile.user[0] : driverProfile?.user;
        const vehicle = Array.isArray(r.vehicle) ? r.vehicle[0] : r.vehicle;

        let myBookingId: string | null = null;
        let myBookingStatus: BookingStatus | null = null;
        let mySeats = 1;
        if (userId) {
          const { data: myBooking } = await supabase
            .from('bookings')
            .select('booking_id, status, seats_reserved')
            .eq('ride_id', rideId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (myBooking) {
            myBookingId = myBooking.booking_id as string;
            myBookingStatus = myBooking.status as BookingStatus;
            mySeats = myBooking.seats_reserved ?? 1;
          }
        }

        setDetail({
          rideId: r.ride_id,
          status: coerceRideStatus(r.status),
          originAddress: r.origin_address,
          destinationAddress: r.destination_address,
          driverName: driverUser?.full_name ?? null,
          driverPhoto: driverUser?.profile_photo ?? null,
          driverRating: driverProfile?.rating != null ? Number(driverProfile.rating) : null,
          vehicle: vehicle
            ? [vehicle.brand, vehicle.model, vehicle.license_plate].filter(Boolean).join(' · ')
            : null,
          pricePerSeat: r.price_per_seat != null ? Number(r.price_per_seat) : null,
          myBookingId,
          myBookingStatus,
          mySeats,
        });
        setLoading(false);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? 'Error inesperado.');
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`passenger-active:${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `ride_id=eq.${rideId}`,
      }, (payload: any) => {
        const row = payload?.new;
        if (!row || !active) return;
        setDetail(prev => prev ? { ...prev, status: coerceRideStatus(row.status) } : prev);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [rideId]);

  // Ride terminal states
  useEffect(() => {
    if (!detail) return;
    if (detail.status === 'completed') {
      activeRideStore.clear();
      navigation.replace('PassengerFinishedRide', { rideId: detail.rideId });
    } else if (detail.status === 'cancelled') {
      activeRideStore.clear();
      Alert.alert('Viaje cancelado', 'El conductor canceló el viaje.',
        [{ text: 'Entendido', onPress: () => navigation.replace('Home') }]);
    }
  }, [detail?.status, detail?.rideId, detail, navigation]);

  // Booking realtime
  useEffect(() => {
    if (!detail?.myBookingId) return;
    const bookingId = detail.myBookingId;
    const channel = supabase
      .channel(`my-booking-active:${bookingId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `booking_id=eq.${bookingId}`,
      }, (payload: any) => {
        const row = payload?.new;
        if (!row) return;
        setDetail(prev =>
          prev ? { ...prev, myBookingStatus: row.status as BookingStatus } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [detail?.myBookingId]);

  // Booking terminal
  useEffect(() => {
    if (detail?.myBookingStatus === 'completed' && detail.rideId) {
      activeRideStore.clear();
      navigation.replace('PassengerFinishedRide', { rideId: detail.rideId });
    }
    if (detail?.myBookingStatus === 'rejected') {
      activeRideStore.clear();
      Alert.alert('Reserva rechazada', 'Tu reserva fue rechazada por el conductor.',
        [{ text: 'Entendido', onPress: () => navigation.replace('Home') }]);
    }
  }, [detail?.myBookingStatus, detail?.rideId, navigation]);

  const handleCancelMyBooking = () => {
    if (!detail?.myBookingId) return;
    Alert.alert('Cancelar mi reserva', '¿Continuar? Perderás tu lugar.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          const { success, error: err } = await updateStatus(detail.myBookingId!, 'cancelled');
          if (!success) { Alert.alert('Error', err ?? 'Inténtalo de nuevo.'); return; }
          activeRideStore.clear();
          navigation.replace('Home');
        },
      },
    ]);
  };

  // ─── Loading / Error ───────────────────────────────────────────────
  if (loading && !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.mutedText}>Cargando viaje…</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={32} color={colors.status.error} />
        <Text style={styles.errorText}>{error ?? 'No se encontró el viaje.'}</Text>
        <Button title="Volver" variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const myFare = detail.pricePerSeat != null
    ? `$${(detail.pricePerSeat * detail.mySeats).toFixed(2)} MXN`
    : null;

  const isInProgress = detail.status === 'in_progress';

  return (
    <View style={styles.screen}>
      {/* ─── Map ────────────────────────────────────── */}
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

        <View style={[styles.floatingBtnRow, { top: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.floatingBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          {isInProgress && (
            <TouchableOpacity
              style={styles.floatingBtnChat}
              onPress={() => navigation.navigate('Chat', { rideId: detail.rideId })}
            >
              <MaterialIcons name="chat" size={22} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Bottom Sheet ──────────────────────────── */}
      <View style={styles.sheet}>
        <View style={styles.pillWrap}>
          <View style={styles.pill} />
        </View>

        {tracking.isStale && isInProgress && (
          <View style={styles.warnBanner}>
            <MaterialIcons name="signal-wifi-off" size={16} color="#92400E" />
            <Text style={styles.warnText}>Conexión inestable</Text>
          </View>
        )}

        {/* Title row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.sheetTitle}>Viaje en curso</Text>
            {myFare && <Text style={styles.fareText}>Tarifa: {myFare}</Text>}
          </View>
          <Text style={styles.arrivalText}>
            Llegada aprox. —
          </Text>
        </View>

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Driver card */}
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <MaterialIcons name="person" size={32} color={colors.text.muted} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {detail.driverName ?? 'Conductor'}{' '}
                <Text style={styles.driverTag}>(Conductor)</Text>
              </Text>
              {detail.vehicle && (
                <Text style={styles.driverVehicle}>{detail.vehicle}</Text>
              )}
            </View>
            {detail.driverRating != null && (
              <View style={styles.ratingPill}>
                <Text style={styles.ratingValue}>
                  {detail.driverRating.toFixed(1)}
                </Text>
                <MaterialIcons name="star" size={14} color={colors.status.warning} />
              </View>
            )}
          </View>

          {/* Timeline stops */}
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.tlDotRow}>
                <View style={styles.tlDotOrigin} />
                <View style={styles.tlLine} />
              </View>
              <View style={styles.tlContent}>
                <Text style={styles.tlLabel}>Punto de encuentro</Text>
                <Text style={styles.tlAddress} numberOfLines={2}>
                  {detail.originAddress ?? 'Origen'}
                </Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={styles.tlDotRow}>
                <View style={styles.tlDotDest} />
              </View>
              <View style={styles.tlContent}>
                <Text style={styles.tlLabel}>Tu parada</Text>
                <Text style={styles.tlAddress} numberOfLines={2}>
                  {detail.destinationAddress ?? 'Destino'}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.ctaSection}>
            <Button
              title="Compartir Viaje"
              variant="primary"
              leftIcon={<MaterialIcons name="share" size={18} color={colors.text.inverse} />}
              onPress={() => {/* TODO: share */}}
            />

            {detail.myBookingStatus &&
              (detail.myBookingStatus === 'confirmed' ||
                detail.myBookingStatus === 'pending' ||
                detail.myBookingStatus === 'in_progress') &&
              detail.status !== 'completed' && (
                <TouchableOpacity
                  onPress={handleCancelMyBooking}
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
  mutedText: { fontSize: typography.size.md, color: colors.text.secondary },
  errorText: { fontSize: typography.size.md, color: colors.status.error, textAlign: 'center' },

  // ── Map ─────────────────────────────
  mapArea: { height: MAP_HEIGHT, backgroundColor: colors.map.background },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.xs,
  },
  mapLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
  },
  floatingBtnRow: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingBtn: {
    width: 44, height: 44, borderRadius: radii.full,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },
  floatingBtnChat: {
    width: 44, height: 44, borderRadius: radii.full,
    backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },

  // ── Sheet ───────────────────────────
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
    width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border.default,
  },
  warnBanner: {
    flexDirection: 'row', alignItems: 'center', columnGap: spacing.sm,
    backgroundColor: colors.status.warningLight,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg, borderRadius: radii.md, marginBottom: spacing.sm,
  },
  warnText: { fontSize: typography.size.sm, color: '#92400E' },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  fareText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginTop: 2,
  },
  arrivalText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.status.success,
  },

  scrollFlex: { flex: 1 },
  scrollInner: { paddingHorizontal: spacing.lg },

  // ── Driver card ─────────────────────
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    columnGap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.border.light,
    alignItems: 'center', justifyContent: 'center',
  },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  driverTag: {
    fontWeight: typography.weight.regular,
    color: colors.text.secondary,
  },
  driverVehicle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    columnGap: 2,
  },
  ratingValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  // ── Timeline ────────────────────────
  timeline: {
    marginBottom: spacing.lg,
    paddingLeft: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  tlDotRow: {
    width: 24,
    alignItems: 'center',
  },
  tlDotOrigin: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 3, borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  tlLine: {
    flex: 1, width: 2,
    backgroundColor: colors.border.default,
    marginVertical: 2,
  },
  tlDotDest: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.status.error,
  },
  tlContent: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tlLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tlAddress: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: 2,
  },

  // ── CTA ─────────────────────────────
  ctaSection: {
    rowGap: spacing.sm,
    marginTop: spacing.md,
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
