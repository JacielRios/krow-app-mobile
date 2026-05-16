import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import {
  PassengerActiveRideScreen,
  PassengerFinishedRideScreen,
  PassengerWaitingScreen,
  RequestRideScreen,
  DriverActiveRideScreen,
  DriverFinishedRideScreen,
  PublishRideScreen,
  RideRequestsScreen,
} from '../../features/ride';
import { ChatScreen } from '../../features/ride/screens/ChatScreen';

export type MainStackParamList = {
  Home: undefined;
  // Passenger
  RequestRide: undefined;
  PassengerWaiting: { bookingId: string };
  PassengerActiveRide: { rideId: string };
  PassengerFinishedRide: { rideId: string };
  // Driver
  PublishRide: undefined;
  RideRequests: { rideId: string };
  DriverActiveRide: { rideId: string };
  DriverFinishedRide: { rideId: string };
  // Shared
  Chat: { rideId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Passenger Flow */}
      <Stack.Screen name="RequestRide" component={RequestRideScreen} />
      <Stack.Screen name="PassengerWaiting" component={PassengerWaitingScreen} />
      <Stack.Screen
        name="PassengerActiveRide"
        component={PassengerActiveRideScreen}
      />
      <Stack.Screen
        name="PassengerFinishedRide"
        component={PassengerFinishedRideScreen}
      />

      {/* Driver Flow */}
      <Stack.Screen name="PublishRide" component={PublishRideScreen} />
      <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
      <Stack.Screen
        name="DriverActiveRide"
        component={DriverActiveRideScreen}
      />
      <Stack.Screen
        name="DriverFinishedRide"
        component={DriverFinishedRideScreen}
      />

      {/* Shared */}
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
