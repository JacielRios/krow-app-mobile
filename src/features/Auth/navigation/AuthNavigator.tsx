import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
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
          headerTintColor: '#002C6F', // Back button color matching theme
        }}
      />
    </Stack.Navigator>
  );
}
