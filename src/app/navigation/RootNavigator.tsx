import { KrowAlert as Alert } from '../../shared/components/ui-v2/dialogService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, NativeModules } from 'react-native';
import Config from 'react-native-config';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {
  rideFromLink,
  bookingFromLink,
  isInvitationLink,
} from '../../features/ride-runtime/deepLinks';
import { BookingEventsHost } from '../../features/pilot/BookingEventsHost';
import { synchronizePushSession } from '../../features/ride-runtime/pushRegistration';
import { nativeNavigation } from '../../features/ride-runtime/nativeNavigation';
import type { MainStackParamList } from './MainNavigator';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { clearReadOnlyActor } from '../../core/offline/readOnlyCache';
import { useConductorLoginGateBlocking } from '../conductorLoginGate';
import AuthNavigator from '../../features/auth/navigation/AuthNavigator';
import MainNavigator from './MainNavigator';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { useQueryClient } from '@tanstack/react-query';
import { synchronizePilotPush } from '../../features/pilot/pilotPush';
import { useNotificationPermissionStartup } from '../../features/pilot/useNotificationPermissionStartup';
import { notificationsAllowed } from '../../features/pilot/notificationPermission';
import { pilotTracking } from '../../features/pilot/nativeTracking';
import { PasswordResetScreen } from '../../features/auth/Screens/PasswordResetScreen';
import {
  ScreenContainer,
  Text,
  Button,
  Skeleton,
} from '../../shared/components/ui-v2';

export default function RootNavigator() {
  const cache = useQueryClient();
  const [recovering, setRecovering] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const navigationRef = useRef(
    createNavigationContainerRef<MainStackParamList>(),
  ).current;
  const [pendingRide, setPendingRide] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<string | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState(false);
  const [routeName, setRouteName] = useState('Home');
  const openedRide = useRef<string | null>(null);
  const { theme, colorScheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [actorId, setActorId] = useState<string | undefined>();
  const previousActor = useRef<string | undefined>(undefined);
  const conductorLoginBlocking = useConductorLoginGateBlocking();
  const notificationPermissionReady = useNotificationPermissionStartup();
  useEffect(() => {
    let alive = true;
    let pushAttempt = 0;
    let pushRetry: ReturnType<typeof setTimeout> | undefined;
    const syncPilot = () => {
      clearTimeout(pushRetry);
      if (isAuthenticated && AppState.currentState !== 'active') return;
      const attempt = ++pushAttempt;
      void synchronizePilotPush(isAuthenticated === true).catch(async () => {
        const permitted = await notificationsAllowed().catch(() => false);
        if (
          permitted &&
          alive &&
          attempt === pushAttempt &&
          isAuthenticated &&
          AppState.currentState === 'active'
        )
          pushRetry = setTimeout(syncPilot, 30000);
      });
    };
    if (
      isAuthenticated === false ||
      (previousActor.current && previousActor.current !== actorId)
    ) {
      if (Config.KROW_PILOT_PUSH_ENABLED === 'true')
        void synchronizePilotPush(false).catch(() => undefined);
      void nativeNavigation.stop().catch(() => undefined);
      void pilotTracking.stop().catch(() => undefined);
      Alert.clear();
      cache.clear();
      if (previousActor.current)
        void clearReadOnlyActor(previousActor.current).catch(() => undefined);
    }
    previousActor.current = actorId;
    if (
      isAuthenticated !== null &&
      (!isAuthenticated || notificationPermissionReady) &&
      Config.KROW_PILOT_PUSH_ENABLED === 'true'
    )
      syncPilot();
    if (isAuthenticated !== null && Config.KROW_RUNTIME_ENABLED === 'true')
      void synchronizePushSession(isAuthenticated).catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (
        state === 'active' &&
        isAuthenticated &&
        notificationPermissionReady &&
        Config.KROW_PILOT_PUSH_ENABLED === 'true'
      )
        syncPilot();
      if (
        state === 'active' &&
        isAuthenticated &&
        Config.KROW_RUNTIME_ENABLED === 'true'
      )
        void synchronizePushSession(true).catch(() => undefined);
    });
    return () => {
      alive = false;
      clearTimeout(pushRetry);
      subscription.remove();
    };
  }, [isAuthenticated, actorId, cache, notificationPermissionReady]);

  useEffect(() => {
    let alive = true;
    const accept = (url: string | null) => {
      if (!url) return;
      void sessionAdapter
        .acceptAuthLink(url)
        .then(result => {
          if (alive && result === 'recovery') setRecovering(true);
        })
        .catch(() => {
          if (alive) {
            setSessionError(true);
            Alert.alert(
              'No pudimos abrir el enlace de acceso',
              'Solicita un enlace nuevo de recuperación o confirmación e intenta nuevamente.',
              undefined,
              { type: 'error' },
            );
          }
        });
      if (
        Config.KROW_RUNTIME_ENABLED !== 'true' &&
        Config.KROW_PILOT_ENABLED !== 'true'
      )
        return;
      const id = rideFromLink(url, Config.KROW_LINK_ORIGIN);
      if (id) {
        openedRide.current = null;
        setPendingRide(id);
        setPendingBooking(bookingFromLink(url, Config.KROW_LINK_ORIGIN));
        setPendingInvitation(isInvitationLink(url, Config.KROW_LINK_ORIGIN));
      }
    };
    void Linking.getInitialURL()
      .then(accept)
      .catch(() => undefined);
    const push = NativeModules.KrowNotifications as
      | { consumeRide?: () => Promise<string | null> }
      | undefined;
    void push
      ?.consumeRide?.()
      .then(id => {
        if (id && Config.KROW_LINK_ORIGIN)
          accept(`${Config.KROW_LINK_ORIGIN}/rides/${id}`);
      })
      .catch(() => undefined);
    const subscription = Linking.addEventListener('url', event =>
      accept(event.url),
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const openPendingRide = useCallback(() => {
    const target = pendingBooking
      ? 'BookingRequests'
      : pendingInvitation
      ? 'RideInvitation'
      : Config.KROW_RUNTIME_ENABLED === 'true'
      ? 'RuntimeRide'
      : 'RideScheduled';
    if (
      isAuthenticated &&
      !conductorLoginBlocking &&
      pendingRide &&
      navigationRef.isReady() &&
      navigationRef.getRootState()?.routeNames.includes(target)
    ) {
      if (openedRide.current === pendingRide) return;
      openedRide.current = pendingRide;
      if (pendingBooking)
        navigationRef.navigate('BookingRequests', {
          rideId: pendingRide,
          bookingId: pendingBooking,
        });
      else
        navigationRef.navigate(
          target as 'RuntimeRide' | 'RideScheduled' | 'RideInvitation',
          {
            rideId: pendingRide,
          },
        );
      setPendingRide(null);
      setPendingBooking(null);
      setPendingInvitation(false);
    }
  }, [
    isAuthenticated,
    conductorLoginBlocking,
    pendingRide,
    pendingBooking,
    pendingInvitation,
    navigationRef,
  ]);
  useEffect(() => {
    const timer = setTimeout(openPendingRide, 0);
    return () => clearTimeout(timer);
  }, [openPendingRide]);

  useEffect(() => {
    let alive = true;
    let receivedAuthEvent = false;
    sessionAdapter
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!alive || receivedAuthEvent) return;
        if (error) throw error;
        setIsAuthenticated(!!session);
        setActorId(session?.user.id);
      })
      .catch(() => {
        if (alive && !receivedAuthEvent) setSessionError(true);
      });

    const unsubscribe = sessionAdapter.onAuthStateChange(
      (authenticated, id, event) => {
        if (!alive) return;
        receivedAuthEvent = true;
        if (event === 'PASSWORD_RECOVERY') setRecovering(true);
        if (!authenticated) setRecovering(false);
        setSessionError(false);
        setIsAuthenticated(authenticated);
        setActorId(id);
      },
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <ScreenContainer padded>
        <Text variant="title">Preparando KROW</Text>
        {sessionError ? (
          <>
            <Text tone="error">No pudimos recuperar la sesión.</Text>
            <Button
              title="Volver a iniciar sesión"
              onPress={() => {
                void sessionAdapter
                  .signOut()
                  .then(({ error }) => {
                    if (error) throw error;
                    setIsAuthenticated(false);
                    setActorId(undefined);
                  })
                  .catch(() => setSessionError(true));
              }}
            />
          </>
        ) : (
          <Skeleton height={160} />
        )}
      </ScreenContainer>
    );
  }
  if (recovering && isAuthenticated)
    return <PasswordResetScreen onDone={() => setRecovering(false)} />;

  const showMainNavigator = Boolean(isAuthenticated) && !conductorLoginBlocking;

  const navigationChanged = () => {
    setRouteName(navigationRef.getCurrentRoute?.()?.name ?? 'Home');
    openPendingRide();
  };
  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={navigationChanged}
        onStateChange={navigationChanged}
        theme={{
          ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
          colors: {
            ...(colorScheme === 'dark'
              ? DarkTheme.colors
              : DefaultTheme.colors),
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surfaceRaised,
            text: theme.colors.textPrimary,
            border: theme.colors.border,
            notification: theme.colors.status.error,
          },
        }}
      >
        {showMainNavigator ? (
          <MainNavigator key={actorId} />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
      {showMainNavigator &&
        actorId &&
        !pendingRide &&
        Config.KROW_PILOT_ENABLED === 'true' && (
          <BookingEventsHost
            key={actorId}
            actorId={actorId}
            routeName={routeName}
            onOpen={(bookingId, rideId) =>
              navigationRef.navigate('BookingRequests', { bookingId, rideId })
            }
          />
        )}
    </>
  );
}
