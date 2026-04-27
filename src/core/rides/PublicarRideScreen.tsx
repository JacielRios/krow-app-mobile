import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import InputPartidaDestino from './components/driver/InputPartidaDestino';
import TarjetaDetalleRuta from './components/driver/TarjetaDetalleRuta';
import BotonPublicarRide from './components/driver/BotonPublicarRide';

export interface NewRide {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  possibleStops: string;
  departureTime: string;
  availableSeats: number;
}

interface Props {
  onPublish: (ride: NewRide) => void;
}

export default function PublicarRideScreen({ onPublish }: Props) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // Estos valores vendrán de tu API/lógica posterior
  const routeData = useMemo(() => {
    if (!origin || !destination) return null;
    return {
      distance: '18 Km',
      duration: '35 minutos',
      possibleStops: '6 Cuervoparadas',
      departureTime: '19:00 pm',
      availableSeats: 0,
    };
  }, [origin, destination]);

  const isComplete = origin.trim() !== '' && destination.trim() !== '';

  const handlePublish = () => {
    if (!routeData) return;

    const ride: NewRide = {
      origin,
      destination,
      ...routeData,
    };

    onPublish(ride);
    Alert.alert('Ride publicado', `${origin} → ${destination}`);

    // Reset
    setOrigin('');
    setDestination('');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <InputPartidaDestino
          origin={origin}
          destination={destination}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
        />

        {routeData && (
          <TarjetaDetalleRuta
            distance={routeData.distance}
            duration={routeData.duration}
            possibleStops={routeData.possibleStops}
            departureTime={routeData.departureTime}
            availableSeats={routeData.availableSeats}
          />
        )}

        <BotonPublicarRide
          onPress={handlePublish}
          disabled={!isComplete}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Verde claro de fondo como en tu imagen
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});