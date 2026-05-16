import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { StarRating } from '../../components';
import { Button } from '../../../../shared/components/ui/Button';
import { useRideRealtime, useSubmitReview } from '../../hooks';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type RouteProp = NativeStackScreenProps<
  MainStackParamList,
  'DriverFinishedRide'
>['route'];
type Nav = NativeStackNavigationProp<
  MainStackParamList,
  'DriverFinishedRide'
>;

interface Feedback {
  id: string;
  userId: string;
  name: string;
  rating: number;
  comment: string;
}

const getAvatarColor = (i: number) =>
  colors.avatarColors[i % colors.avatarColors.length];

export const DriverFinishedRideScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp>();
  const insets = useSafeAreaInsets();
  const rideId = route.params?.rideId ?? null;

  const { ride, bookings, loading } = useRideRealtime(rideId);
  const { submitReview, loading: submitting } = useSubmitReview();

  const completedBookings = useMemo(
    () => bookings.filter(b => b.status === 'completed' || b.status === 'confirmed'),
    [bookings],
  );

  const [passengers, setPassengers] = useState<Feedback[]>([]);

  useEffect(() => {
    setPassengers(prev => {
      const byId = new Map(prev.map(p => [p.id, p]));
      return completedBookings.map(b => ({
        id: b.bookingId,
        userId: b.passenger.userId,
        name: b.passenger.fullName ?? 'Pasajero',
        rating: byId.get(b.bookingId)?.rating ?? 0,
        comment: byId.get(b.bookingId)?.comment ?? '',
      }));
    });
  }, [completedBookings]);

  const updatePassengerRating = (id: string, rating: number) => {
    setPassengers(prev => prev.map(p => (p.id === id ? { ...p, rating } : p)));
  };

  const updatePassengerComment = (id: string, comment: string) => {
    setPassengers(prev => prev.map(p => (p.id === id ? { ...p, comment } : p)));
  };

  const handleSubmitReviews = async () => {
    if (!rideId) return;
    const toReview = passengers.filter(p => p.rating > 0);
    if (toReview.length === 0) { navigation.navigate('Home'); return; }
    let errors = 0;
    for (const p of toReview) {
      const { error } = await submitReview(rideId, p.userId, p.rating, p.comment || undefined);
      if (error) errors++;
    }
    if (errors > 0) {
      Alert.alert('Atención', `${errors} calificación(es) no se pudieron enviar.`);
    }
    navigation.navigate('Home');
  };

  const totalEarnings = useMemo(() => {
    if (!ride?.pricePerSeat) return null;
    return completedBookings.reduce(
      (acc, b) => acc + (ride.pricePerSeat ?? 0) * b.seatsReserved, 0,
    );
  }, [completedBookings, ride?.pricePerSeat]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {ride?.status === 'cancelled' ? 'Viaje cancelado' : '¡Viaje Completado!'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {ride?.destinationAddress ?? 'Has llegado al destino final'}
        </Text>

        {/* Stats pill */}
        <View style={styles.statsPill}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{passengers.length}</Text>
            <Text style={styles.statLabel}>Pasajeros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {totalEarnings != null ? `$${totalEarnings.toFixed(0)}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Total MXN</Text>
          </View>
        </View>
      </View>

      {/* ─── Rating Card ────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Califica a tus pasajeros</Text>

        {loading && passengers.length === 0 && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {passengers.length === 0 && !loading && (
          <Text style={styles.emptyText}>
            No hubo pasajeros confirmados en este viaje.
          </Text>
        )}

        {passengers.map((p, index) => (
          <View key={p.id} style={styles.feedbackItem}>
            <View style={styles.pRow}>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
                <Text style={styles.avatarText}>
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.pName}>{p.name}</Text>
            </View>

            <View style={styles.ratingWrap}>
              <StarRating
                rating={p.rating}
                onRatingChange={r => updatePassengerRating(p.id, r)}
                size={36}
              />
            </View>

            <TextInput
              style={styles.textInput}
              placeholder={`Añade un comentario sobre ${p.name.split(' ')[0]}...`}
              placeholderTextColor={colors.text.placeholder}
              value={p.comment}
              onChangeText={text => updatePassengerComment(p.id, text)}
              multiline
            />

            {index < passengers.length - 1 && <View style={styles.feedbackDivider} />}
          </View>
        ))}

        <View style={styles.submitSection}>
          <Button
            title={submitting ? 'Enviando…' : 'Enviar calificaciones'}
            onPress={handleSubmitReviews}
            loading={submitting}
            disabled={submitting}
          />
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: spacing.xxl,
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
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  statLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.md,
  },

  // ── Card ─────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.lg,
    ...shadows.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  feedbackItem: {
    marginBottom: spacing.md,
  },
  pRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  pName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  ratingWrap: {
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.xl,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.size.md,
    minHeight: 48,
  },
  feedbackDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: spacing.lg,
  },
  submitSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    rowGap: spacing.sm,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: typography.size.md,
  },
});
