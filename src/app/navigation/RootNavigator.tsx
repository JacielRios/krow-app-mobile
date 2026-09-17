import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { useConductorLoginGateBlocking } from '../conductorLoginGate';
import AuthNavigator from '../../features/auth/navigation/AuthNavigator';
import MainNavigator from './MainNavigator';
import { useTheme } from '../../shared/theme/ThemeProvider';

export default function RootNavigator() {
  const { theme, colorScheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const conductorLoginBlocking = useConductorLoginGateBlocking();

  useEffect(() => {
    sessionAdapter.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const unsubscribe = sessionAdapter.onAuthStateChange(setIsAuthenticated);

    return unsubscribe;
  }, []);

  if (isAuthenticated === null) {
    return null;
  }

  const showMainNavigator = Boolean(isAuthenticated) && !conductorLoginBlocking;

  return (
    <NavigationContainer
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
      {showMainNavigator ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
