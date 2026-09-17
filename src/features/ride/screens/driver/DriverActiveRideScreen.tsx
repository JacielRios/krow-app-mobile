import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { Button } from '../../../../shared/components/ui/Button';
import { colors } from '../../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../../shared/theme/tokens';
import { rideApi } from '../../api/rideApi';
import { RoutePreviewMap } from '../../../maps';
import { PassengerStopCard } from '../../components';
import { useActiveRideData } from '../../hooks';
import type {
  ActivePassenger,
  ActiveRideData,
} from '../../hooks/useActiveRideData';
import type { RideHeader } from '../../types/booking.types';
import type { MainStackParamList } from '../../../../app/navigation/MainNavigator';

type DriverActiveRideRouteProp = NativeStackScreenProps<
  MainStackParamList,
  'DriverActiveRide'
>['route'];
type DriverActiveRideNav = NativeStackNavigationProp<
  MainStackParamList,
  'DriverActiveRide'
>;

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const DriverActiveRideScreen: React.FC = () => {
  const navigation = useNavigation<DriverActiveRideNav>();
  const route = useRoute<DriverActiveRideRouteProp>();
  const insets = useSafeAreaInsets();

  const { rideId } = route.params;

  const { data, loading, error, reload } = useActiveRideData(rideId);

  const driverData = useMemo<
    Extract<ActiveRideData, { role: 'conductor' }> | null
  >(() => {
    if (!data) return null;
    return data.role === 'conductor' ? data : null;
  }, [data]);

  const showInitialLoader = loading && !data;
  const allArrived =
    driverData != null &&
    driverData.passengers.length > 0 &&
    driverData.passengers.every(p => p.bookingStatus === 'completed');

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom:
              insets.bottom + spacing.xl + (allArrived ? FOOTER_HEIGHT : 0),
          },
        ]}
      >
        <ScreenHeader
          ride={driverData?.ride ?? null}
          onBack={() => navigation.goBack()}
        />

        {showInitialLoader ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centeredText}>Cargando…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <MaterialIcons
              name="error-outline"
              size={32}
              color={colors.status.error}
            />
            <Text style={styles.centeredErrorText}>{error}</Text>
            <View style={styles.retryWrap}>
              <Button title="Reintentar" onPress={reload} />
            </View>
          </View>
        ) : driverData ? (
          <DriverContent data={driverData} reload={reload} />
        ) : null}
      </ScrollView>

      {allArrived && driverData && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <Button
            title="Finalizar viaje"
            onPress={() =>
              navigation.replace('DriverFinishedRide', {
                rideId: driverData.ride.rideId,
              })
            }
          />
        </View>
      )}
    </View>
  );
};

// =====================================================================
// Header
// =====================================================================

const ScreenHeader: React.FC<{
  ride: RideHeader | null;
  onBack: () => void;
}> = ({ ride, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.backBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialIcons
        name="arrow-back"
        size={24}
        color={colors.text.primary}
      />
    </TouchableOpacity>
    <View style={styles.headerText}>
      <Text style={styles.title}>Viaje en curso</Text>
      {ride && (
        <Text style={styles.subtitle} numberOfLines={2}>
          {(ride.originAddress ?? 'Origen') +
            ' → ' +
            (ride.destinationAddress ?? 'Destino')}
        </Text>
      )}
      {ride && (
        <View style={styles.headerMetaRow}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={colors.text.secondary}
          />
          <Text style={styles.headerMetaText}>
            Sale {formatTime(ride.departureTime)}
          </Text>
        </View>
      )}
    </View>
  </View>
);

// =====================================================================
// Contenido principal del conductor
// =====================================================================

const DriverContent: React.FC<{
  data: Extract<ActiveRideData, { role: 'conductor' }>;
  reload: () => void;
}> = ({ data, reload }) => {
  const { ride, passengers } = data;
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const handleComplete = async (passenger: ActivePassenger) => {
    if (actionBookingId !== null) return;
    setActionBookingId(passenger.bookingId);
    try {
      await rideApi.completeStop(ride.rideId, passenger.bookingId);
      // El hook actualiza periódicamente; pedimos una recarga inmediata para
      // reflejar la acción sin esperar al siguiente intervalo.
      reload();
    } catch (e: any) {
      Alert.alert(
        'No se pudo completar la parada',
        e?.message ?? 'Inténtalo de nuevo.',
      );
    } finally {
      setActionBookingId(null);
    }
  };

  const visibleOnMap = passengers.filter(
    p => p.bookingStatus !== 'completed',
  );

  const origin =
    ride.originLat != null && ride.originLng != null
      ? { lat: ride.originLat, lng: ride.originLng }
      : null;
  const destination =
    ride.destinationLat != null && ride.destinationLng != null
      ? { lat: ride.destinationLat, lng: ride.destinationLng }
      : null;

  const extraMarkers = visibleOnMap.map(p => ({
    id: p.bookingId,
    point: { lat: p.dropoffLat, lng: p.dropoffLng },
    color: colors.status.info,
    iconName: 'place',
  }));

  return (
    <>
      <View style={styles.mapWrap}>
        <RoutePreviewMap
          origin={origin}
          destination={destination}
          encodedPolyline={ride.routePolyline ?? null}
          extraMarkers={extraMarkers}
          height={220}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Pasajeros ({passengers.length})
      </Text>

      {passengers.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons
            name="inbox"
            size={32}
            color={colors.text.placeholder}
          />
          <Text style={styles.centeredText}>
            No hay pasajeros en este viaje.
          </Text>
        </View>
      ) : (
        passengers.map(p => (
          <PassengerStopCard
            key={p.bookingId}
            passenger={p}
            busy={actionBookingId === p.bookingId}
            anyActionBusy={actionBookingId !== null}
            onComplete={() => handleComplete(p)}
          />
        ))
      )}
    </>
  );
};

// =====================================================================
// Estilos
// =====================================================================

const FOOTER_HEIGHT = 88;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  headerMetaText: {
    marginLeft: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  mapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    marginTop: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  centeredErrorText: {
    marginTop: spacing.sm,
    fontSize: typography.size.md,
    color: colors.status.error,
    textAlign: 'center',
  },
  retryWrap: {
    marginTop: spacing.md,
    width: '60%',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
