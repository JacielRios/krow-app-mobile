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
import { TrackingScreen } from '../pilot/TrackingScreen';
import { ScheduledScreen } from '../pilot/ScheduledScreen';
import {
  Button,
  FeedbackState,
  ScreenContainer,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';

class RideScreenBoundary extends React.Component<
  {
    children: React.ReactNode;
    onBack: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ScreenContainer padded>
        <ScreenHeader title="Viaje en curso" onBack={this.props.onBack} />
        <FeedbackState
          kind="error"
          title="No pudimos abrir la ruta"
          description="El viaje sigue disponible. Vuelve a intentarlo o regresa a tus viajes."
          actionLabel="Reintentar"
          onAction={() => this.setState({ failed: false })}
        />
        <Button
          title="Volver a mis viajes"
          variant="outline"
          onPress={this.props.onBack}
        />
      </ScreenContainer>
    );
  }
}

function RuntimeEntry({
  fallback: Fallback,
}: {
  fallback: React.ComponentType;
}) {
  const route = useRoute();
  const params = route.params as { rideId?: string } | undefined;
  const rideId = typeof params?.rideId === 'string' ? params.rideId : '';
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [legacy, setLegacy] = useState(Config.KROW_RUNTIME_ENABLED !== 'true');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!rideId) {
      setError(
        'No pudimos identificar el viaje. Regresa a tus viajes y vuelve a abrirlo.',
      );
      return;
    }
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
              try {
                const session = await sessionAdapter.getSession();
                const actorId = session.data.session?.user.id;
                if (actorId && (await sessionCache.read(actorId, rideId))) {
                  if (active) navigation.replace('RuntimeRide', { rideId });
                  return;
                }
              } catch {
                // Broken local storage/session restoration is recoverable here.
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
  if (!rideId)
    return (
      <ScreenContainer padded>
        <ScreenHeader title="Viaje" onBack={() => navigation.goBack()} />
        <FeedbackState
          kind="error"
          title="No pudimos abrir el viaje"
          description={error ?? undefined}
          actionLabel="Volver a mis viajes"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  if (legacy)
    return (
      <RideScreenBoundary key={rideId} onBack={() => navigation.goBack()}>
        <Fallback />
      </RideScreenBoundary>
    );
  return <View>{error ? <Text>{error}</Text> : <ActivityIndicator />}</View>;
}
export const ScheduledRuntimeEntry = () => (
  <RuntimeEntry
    fallback={
      Config.KROW_PILOT_ENABLED === 'true'
        ? ScheduledScreen
        : RideScheduledScreen
    }
  />
);
export const DriverRuntimeEntry = () => (
  <RuntimeEntry
    fallback={
      Config.KROW_PILOT_ENABLED === 'true'
        ? TrackingScreen
        : DriverActiveRideScreen
    }
  />
);
export const PassengerRuntimeEntry = () => (
  <RuntimeEntry
    fallback={
      Config.KROW_PILOT_ENABLED === 'true'
        ? TrackingScreen
        : PassengerActiveRideScreen
    }
  />
);
