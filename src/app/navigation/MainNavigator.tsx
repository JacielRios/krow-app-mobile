import React from 'react';
import Config from 'react-native-config';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './MainTabs';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { ProfileScreen } from '../../features/pilot/ProfileScreen';
import { HistoryScreen } from '../../features/pilot/HistoryScreen';
import { ChatScreen } from '../../features/pilot/ChatScreen';
import {
  PassengerFinishedRideScreen,
  RequestRideScreen,
  DriverFinishedRideScreen,
  DriverTripsScreen,
  FavoriteRoutesScreen,
  PublishRideScreen,
} from '../../features/ride';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { RuntimeRideScreen } from '../../features/ride-runtime/RuntimeRideScreen';
import {
  DriverRuntimeEntry,
  PassengerRuntimeEntry,
  ScheduledRuntimeEntry,
} from '../../features/ride-runtime/RuntimeEntry';

export type MainStackParamList = {
  RuntimeRide: { rideId: string };
  Home: undefined;
  Profile: undefined;
  RideHistory: { rideId: string };
  Chat: { bookingId: string };
  // Passenger
  RequestRide: undefined;
  PassengerActiveRide: { rideId: string };
  PassengerFinishedRide: { rideId: string };
  // Driver
  PublishRide:
    | {
        favoriteRouteId?: string;
        editRideId?: string;
        favoriteOnly?: boolean;
      }
    | undefined;
  FavoriteRoutes: undefined;
  DriverTrips: undefined;
  // Shared (driver + passenger)
  RideScheduled: { rideId: string };
  DriverActiveRide: { rideId: string };
  DriverFinishedRide: { rideId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  const { theme, motionEnabled } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: motionEnabled ? 'default' : 'none',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
      initialRouteName="Home"
    >
      <Stack.Screen
        name="Home"
        component={Config.KROW_PILOT_ENABLED === 'true' ? MainTabs : HomeScreen}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="RideHistory" component={HistoryScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="RuntimeRide" component={RuntimeRideScreen} />

      {/* Passenger Flow */}
      <Stack.Screen name="RequestRide" component={RequestRideScreen} />
      <Stack.Screen
        name="PassengerActiveRide"
        component={PassengerRuntimeEntry}
      />
      <Stack.Screen
        name="PassengerFinishedRide"
        component={
          Config.KROW_PILOT_ENABLED === 'true'
            ? HistoryScreen
            : PassengerFinishedRideScreen
        }
        options={{ animation: 'fade' }}
      />

      {/* Driver Flow */}
      <Stack.Screen name="PublishRide" component={PublishRideScreen} />
      <Stack.Screen name="FavoriteRoutes" component={FavoriteRoutesScreen} />
      <Stack.Screen name="DriverTrips" component={DriverTripsScreen} />
      <Stack.Screen name="RideScheduled" component={ScheduledRuntimeEntry} />
      <Stack.Screen name="DriverActiveRide" component={DriverRuntimeEntry} />
      <Stack.Screen
        name="DriverFinishedRide"
        component={
          Config.KROW_PILOT_ENABLED === 'true'
            ? HistoryScreen
            : DriverFinishedRideScreen
        }
        options={{ animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
