import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, NativeModules } from 'react-native';
import Config from 'react-native-config';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { rideFromLink } from '../../features/ride-runtime/deepLinks';
import { synchronizePushSession } from '../../features/ride-runtime/pushRegistration';
import { nativeNavigation } from '../../features/ride-runtime/nativeNavigation';
import type { MainStackParamList } from './MainNavigator';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { useConductorLoginGateBlocking } from '../conductorLoginGate';
import AuthNavigator from '../../features/auth/navigation/AuthNavigator';
import MainNavigator from './MainNavigator';
import { useTheme } from '../../shared/theme/ThemeProvider';

export default function RootNavigator() {
  const navigationRef = useRef(
    createNavigationContainerRef<MainStackParamList>(),
  ).current;
  const [pendingRide, setPendingRide] = useState<string | null>(null);
  const openedRide = useRef<string | null>(null);
  const { theme, colorScheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [actorId, setActorId] = useState<string | undefined>();
  const previousActor = useRef<string | undefined>(undefined);
  const conductorLoginBlocking = useConductorLoginGateBlocking();
  useEffect(() => {
    if (
      isAuthenticated === false ||
      (previousActor.current && previousActor.current !== actorId)
    )
      void nativeNavigation.stop().catch(() => undefined);
    previousActor.current = actorId;
    if (isAuthenticated !== null && Config.KROW_RUNTIME_ENABLED === 'true')
      void synchronizePushSession(isAuthenticated).catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (
        state === 'active' &&
        isAuthenticated &&
        Config.KROW_RUNTIME_ENABLED === 'true'
      )
        void synchronizePushSession(true).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [isAuthenticated, actorId]);

  useEffect(() => {
    const accept = (url: string | null) => {
      if (!url || Config.KROW_RUNTIME_ENABLED !== 'true') return;
      const id = rideFromLink(url, Config.KROW_LINK_ORIGIN);
      if (id) {
        openedRide.current = null;
        setPendingRide(id);
      }
    };
    void Linking.getInitialURL().then(accept);
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
    return () => subscription.remove();
  }, []);

  const openPendingRide = useCallback(() => {
    if (
      isAuthenticated &&
      !conductorLoginBlocking &&
      pendingRide &&
      navigationRef.isReady() &&
      navigationRef.getRootState()?.routeNames.includes('RuntimeRide')
    ) {
      if (openedRide.current === pendingRide) return;
      openedRide.current = pendingRide;
      navigationRef.navigate('RuntimeRide', { rideId: pendingRide });
      setPendingRide(null);
    }
  }, [isAuthenticated, conductorLoginBlocking, pendingRide, navigationRef]);
  useEffect(() => {
    const timer = setTimeout(openPendingRide, 0);
    return () => clearTimeout(timer);
  }, [openPendingRide]);

  useEffect(() => {
    sessionAdapter.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setActorId(session?.user.id);
    });

    const unsubscribe = sessionAdapter.onAuthStateChange(
      (authenticated, id) => {
        setIsAuthenticated(authenticated);
        setActorId(id);
      },
    );

    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    return null;
  }

  const showMainNavigator = Boolean(isAuthenticated) && !conductorLoginBlocking;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={openPendingRide}
      onStateChange={openPendingRide}
      theme={{
        ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surfaceRaised,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
          notification: theme.colors.status.error,
        },
      }}
    >
      {showMainNavigator ? <MainNavigator key={actorId} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
