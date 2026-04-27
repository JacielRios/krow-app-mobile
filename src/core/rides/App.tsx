import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PublicarRideScreen, { NewRide } from './screens/PublicarRideScreen';

export default function App() {
  const handlePublish = (ride: NewRide) => {
    console.log('Ride publicado:', ride);
    // Conectar con tu backend posteriormente
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PublicarRideScreen onPublish={handlePublish} />
    </SafeAreaProvider>
  );
}