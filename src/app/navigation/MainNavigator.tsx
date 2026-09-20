import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import {
  PassengerActiveRideScreen,
  PassengerFinishedRideScreen,
  RequestRideScreen,
  DriverActiveRideScreen,
  DriverFinishedRideScreen,
  DriverTripsScreen,
  FavoriteRoutesScreen,
  PublishRideScreen,
  RideScheduledScreen,
} from '../../features/ride';
import { useTheme } from '../../shared/theme/ThemeProvider';

export type MainStackParamList = {
  Home: undefined;
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
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'default',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Passenger Flow */}
      <Stack.Screen name="RequestRide" component={RequestRideScreen} />
      <Stack.Screen name="PassengerActiveRide" component={PassengerActiveRideScreen} />
      <Stack.Screen name="PassengerFinishedRide" component={PassengerFinishedRideScreen} options={{ animation: 'fade' }} />

      {/* Driver Flow */}
      <Stack.Screen name="PublishRide" component={PublishRideScreen} />
      <Stack.Screen name="FavoriteRoutes" component={FavoriteRoutesScreen} />
      <Stack.Screen name="DriverTrips" component={DriverTripsScreen} />
      <Stack.Screen name="RideScheduled" component={RideScheduledScreen} />
      <Stack.Screen name="DriverActiveRide" component={DriverActiveRideScreen} />
      <Stack.Screen name="DriverFinishedRide" component={DriverFinishedRideScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}
