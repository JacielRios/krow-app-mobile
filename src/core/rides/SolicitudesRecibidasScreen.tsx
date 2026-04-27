import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import HeaderSolicitudes from '../components/HeaderSolicitudes';
import ListaSolicitudesRecibidas from '../components/ListaSolicitudesRecibidas';
import { RideRequest } from '../components/TarjetaSolicitudPasajero';

interface Props {
  requests: RideRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function SolicitudesRecibidasScreen({
  requests,
  onAccept,
  onReject,
}: Props) {
  const handleAccept = (id: string) => {
    Alert.alert('Solicitud aceptada', `ID: ${id}`);
    onAccept(id);
  };

  const handleReject = (id: string) => {
    Alert.alert('Solicitud rechazada', `ID: ${id}`);
    onReject(id);
  };

  // Agrupar por fecha (esto vendría de tu backend)
  const sections = [
    {
      title: 'Hoy',
      data: requests.filter((_, i) => i < 3),
    },
    {
      title: 'Ayer',
      data: requests.filter((_, i) => i >= 3),
    },
  ];

  const pendingCount = requests.length;

  return (
    <View style={styles.container}>
      <HeaderSolicitudes
        title="Solicitudes Recibidas"
        pendingCount={pendingCount}
      />
      <ListaSolicitudesRecibidas
        sections={sections}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});