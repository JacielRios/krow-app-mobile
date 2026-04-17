import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useConductorLoginGateBlocking } from '../auth/conductorLoginGate';
import AuthNavigator from '../../features/auth/navigation/AuthNavigator';
import MainNavigator from './MainNavigator';

export default function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const conductorLoginBlocking = useConductorLoginGateBlocking();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return null;
  }

  const showMainNavigator = Boolean(isAuthenticated) && !conductorLoginBlocking;

  return (
    <NavigationContainer>
      {showMainNavigator ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
