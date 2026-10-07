import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { consumeSkipSplashOnNextAuthMount } from '../../../app/authEntryPreference';
import SplashScreen from '../Screens/SplashScreen';
import LoginScreen from '../Screens/LoginScreen';
import RegisterScreen from '../Screens/RegisterScreen';
import { RecoverScreen } from '../Screens/RecoverScreen';
import { useTheme } from '../../../shared/theme/ThemeProvider';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Recover: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const { theme, motionEnabled } = useTheme();
  consumeSkipSplashOnNextAuthMount();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: motionEnabled ? 'fade' : 'none',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Recover" component={RecoverScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ gestureEnabled: false }} // Prevent going back to splash
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: theme.colors.primary,
        }}
      />
    </Stack.Navigator>
  );
}
