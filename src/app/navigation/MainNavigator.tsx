import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import {
  PassengerActiveRideScreen,
  PassengerFinishedRideScreen,
  RequestRideScreen,
  DriverActiveRideScreen,
  DriverFinishedRideScreen,
  PublishRideScreen,
  RideRequestsScreen,
} from '../../features/ride';

export type MainStackParamList = {
  Home: undefined;
  // Passenger
  RequestRide: undefined;
  PassengerActiveRide: { rideId: string } | undefined;
  PassengerFinishedRide: { rideId: string } | undefined;
  // Driver
  PublishRide: undefined;
  RideRequests: { rideId: string };
  DriverActiveRide: { rideId: string } | undefined;
  DriverFinishedRide: { rideId: string } | undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Passenger Flow */}
      <Stack.Screen name="RequestRide" component={RequestRideScreen} />
      <Stack.Screen name="PassengerActiveRide" component={PassengerActiveRideScreen} />
      <Stack.Screen name="PassengerFinishedRide" component={PassengerFinishedRideScreen} />

      {/* Driver Flow */}
      <Stack.Screen name="PublishRide" component={PublishRideScreen} />
      <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
      <Stack.Screen name="DriverActiveRide" component={DriverActiveRideScreen} />
      <Stack.Screen name="DriverFinishedRide" component={DriverFinishedRideScreen} />
    </Stack.Navigator>
  );
}
