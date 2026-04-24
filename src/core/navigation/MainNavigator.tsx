import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { PassengerActiveRideScreen } from '../../features/ride/screens/passenger/PassengerActiveRideScreen';
import { PassengerFinishedRideScreen } from '../../features/ride/screens/passenger/PassengerFinishedRideScreen';
import { DriverActiveRideScreen } from '../../features/ride/screens/driver/DriverActiveRideScreen';
import { DriverFinishedRideScreen } from '../../features/ride/screens/driver/DriverFinishedRideScreen';
import { PublishRideScreen } from '../../features/ride/screens/driver/PublishRideScreen';
import { UIShowcaseScreen } from '../../features/ui-showcase/screens/UIShowcaseScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Passenger Flow */}
      <Stack.Screen name="PassengerActiveRide" component={PassengerActiveRideScreen} />
      <Stack.Screen name="PassengerFinishedRide" component={PassengerFinishedRideScreen} />

      {/* Driver Flow */}
      <Stack.Screen name="PublishRide" component={PublishRideScreen} />
      <Stack.Screen name="DriverActiveRide" component={DriverActiveRideScreen} />
      <Stack.Screen name="DriverFinishedRide" component={DriverFinishedRideScreen} />

      {/* Dev */}
      <Stack.Screen name="UIShowcase" component={UIShowcaseScreen} />
    </Stack.Navigator>
  );
}
