import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Config from 'react-native-config';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { ApiError } from '../../core/api/apiClient';
import { runtimeApi } from './runtimeApi';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { sessionCache } from './sessionCache';
import { RideScheduledScreen } from '../ride/screens/shared/RideScheduledScreen';
import { DriverActiveRideScreen } from '../ride/screens/driver/DriverActiveRideScreen';
import { PassengerActiveRideScreen } from '../ride/screens/passenger/PassengerActiveRideScreen';

function RuntimeEntry({
  fallback: Fallback,
}: {
  fallback: React.ComponentType;
}) {
  const route = useRoute(),
    { rideId } = route.params as { rideId: string };
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [legacy, setLegacy] = useState(Config.KROW_RUNTIME_ENABLED !== 'true');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (Config.KROW_RUNTIME_ENABLED === 'true')
      void runtimeApi
        .snapshot(rideId)
        .then(() => {
          if (active) navigation.replace('RuntimeRide', { rideId });
        })
        .catch(async cause => {
          if (!active) return;
          if (cause instanceof ApiError && cause.status === 404)
            setLegacy(true);
          else {
            if (
              !(cause instanceof ApiError && [401, 403].includes(cause.status))
            ) {
              const session = await sessionAdapter.getSession();
              const actorId = session.data.session?.user.id;
              if (actorId && (await sessionCache.read(actorId, rideId))) {
                if (active) navigation.replace('RuntimeRide', { rideId });
                return;
              }
            }
            if (!active) return;
            setError(
              'No pudimos recuperar el viaje. Vuelve a intentarlo cuando tengas conexión.',
            );
          }
        });
    return () => {
      active = false;
    };
  }, [rideId, navigation]);
  if (legacy) return <Fallback />;
  return <View>{error ? <Text>{error}</Text> : <ActivityIndicator />}</View>;
}
export const ScheduledRuntimeEntry = () => (
  <RuntimeEntry fallback={RideScheduledScreen} />
);
export const DriverRuntimeEntry = () => (
  <RuntimeEntry fallback={DriverActiveRideScreen} />
);
export const PassengerRuntimeEntry = () => (
  <RuntimeEntry fallback={PassengerActiveRideScreen} />
);
