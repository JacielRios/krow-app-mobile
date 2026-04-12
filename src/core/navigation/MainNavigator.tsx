import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { PassengerActiveRideScreen } from '../../features/ride/screens/passenger/PassengerActiveRideScreen';
import { PassengerFinishedRideScreen } from '../../features/ride/screens/passenger/PassengerFinishedRideScreen';
import { DriverActiveRideScreen } from '../../features/ride/screens/driver/DriverActiveRideScreen';
import { DriverFinishedRideScreen } from '../../features/ride/screens/driver/DriverFinishedRideScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      
      {/* Passenger Flow */}
      <Stack.Screen name="PassengerActiveRide" component={PassengerActiveRideScreen} />
      <Stack.Screen name="PassengerFinishedRide" component={PassengerFinishedRideScreen} />
      
      {/* Driver Flow */}
      <Stack.Screen name="DriverActiveRide" component={DriverActiveRideScreen} />
      <Stack.Screen name="DriverFinishedRide" component={DriverFinishedRideScreen} />
    </Stack.Navigator>
  );
}
