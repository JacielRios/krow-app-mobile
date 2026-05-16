import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
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
import { StarRating } from '../../components';
import { Button } from '../../../../shared/components/ui/Button';
import { useSubmitReview } from '../../hooks';
import { supabase } from '../../../../services/supabase';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RouteProp = NativeStackScreenProps<
  MainStackParamList,
  'PassengerFinishedRide'
>['route'];
type Nav = NativeStackNavigationProp<
  MainStackParamList,
  'PassengerFinishedRide'
>;

interface Summary {
  driverName: string;
  driverUserId: string;
  vehicle: string | null;
  destinationAddress: string | null;
}

export const PassengerFinishedRideScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const rideId = route.params?.rideId ?? null;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const { submitReview, loading: submitting } = useSubmitReview();

  useEffect(() => {
    if (!rideId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select(
          `destination_address,
           driver:driver_profiles!rides_driver_id_fkey(
             user_id,
             user:users!driver_profiles_user_id_fkey(full_name)
           ),
           vehicle:vehicles!rides_vehicle_id_fkey(brand, model, license_plate)`,
        )
        .eq('ride_id', rideId)
        .maybeSingle();
      if (!active || !data) return;
      const r: any = data;
      const driverProfile = Array.isArray(r.driver) ? r.driver[0] : r.driver;
      const driverUser = Array.isArray(driverProfile?.user)
        ? driverProfile.user[0]
        : driverProfile?.user;
      const vehicle = Array.isArray(r.vehicle) ? r.vehicle[0] : r.vehicle;
      setSummary({
        driverName: driverUser?.full_name ?? 'Conductor',
        driverUserId: driverProfile?.user_id ?? '',
        vehicle: vehicle
          ? [vehicle.brand, vehicle.model, vehicle.license_plate].filter(Boolean).join(' · ')
          : null,
        destinationAddress: r.destination_address ?? null,
      });
    })();
    return () => { active = false; };
  }, [rideId]);

  const handleSubmit = async () => {
    if (!rideId || !summary?.driverUserId) {
      navigation.replace('Home');
      return;
    }
    if (rating > 0) {
      const { error } = await submitReview(
        rideId, summary.driverUserId, rating, comment || undefined,
      );
      if (error) Alert.alert('Error', 'No se pudo enviar la calificación.');
    }
    navigation.replace('Home');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.replace('Home')}
        >
          <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>¡Has llegado a tu destino!</Text>
        <Text style={styles.headerSubtitle}>
          Esperamos que hayas tenido un excelente viaje
        </Text>
      </View>

      {/* ─── Card ───────────────────────────────── */}
      <View style={styles.card}>
        {/* Driver avatar overlapping */}
        <View style={styles.avatarOuter}>
          <View style={styles.avatarInner}>
            <MaterialIcons name="person" size={44} color={colors.text.muted} />
          </View>
        </View>

        <Text style={styles.driverName}>
          {summary?.driverName ?? 'Conductor'}
        </Text>
        {summary?.vehicle && (
          <Text style={styles.vehicleText}>{summary.vehicle}</Text>
        )}

        {/* Rating section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>¿Cómo calificarías a tu conductor?</Text>
          <StarRating rating={rating} onRatingChange={setRating} size={42} />
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Añade un comentario (Opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Excelente servicio, muy amable..."
            placeholderTextColor={colors.text.placeholder}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Submit */}
        <Button
          title={submitting ? 'Enviando…' : 'Enviar y Finalizar'}
          loading={submitting}
          disabled={submitting}
          onPress={handleSubmit}
        />
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.replace('Home')}
        >
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.primaryDark,
  },

  // ── Header ───────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.lg,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.xxl + spacing.md,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  headerSubtitle: {
    fontSize: typography.size.lg,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // ── Card ─────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    ...shadows.xl,
  },
  avatarOuter: {
    marginTop: -44,
    marginBottom: spacing.md,
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.background,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  driverName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  vehicleText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // ── Rating ───────────────────────────
  ratingSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    width: '100%',
  },
  ratingTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // ── Comment ──────────────────────────
  commentSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  commentLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.xl,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.text.primary,
    fontSize: typography.size.md,
  },

  // ── Actions ──────────────────────────
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: typography.size.md,
  },
});
