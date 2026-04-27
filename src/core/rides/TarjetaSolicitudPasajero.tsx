import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import BotonAccionSolicitud from '/Proyecto_ReactNative/proyecto_rn_alexa/src/components/BotonAccionSolicitud';

export interface RideRequest {
  id: string;
  passengerName: string;
  passengerPhoto: string;
  rating: number;
  requestTime: string;
}

interface Props {
  request: RideRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function TarjetaSolicitudPasajero({
  request,
  onAccept,
  onReject,
}: Props) {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(request.rating);
    const hasHalfStar = request.rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Text key={i} style={styles.star}>★</Text>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Text key={i} style={styles.starHalf}>★</Text>);
      } else {
        stars.push(<Text key={i} style={styles.starEmpty}>★</Text>);
      }
    }
    return stars;
  };

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        {/* Foto */}
        <Image
          source={{ uri: request.passengerPhoto }}
          style={styles.photo}
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{request.passengerName}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars()}</View>
            <Text style={styles.ratingValue}>{request.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Botones */}
        <BotonAccionSolicitud
          onAccept={() => onAccept(request.id)}
          onReject={() => onReject(request.id)}
        />
      </View>

      {/* Hora de solicitud */}
      <Text style={styles.timeText}>
        Solicitud recibida a las {request.requestTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    color: '#fbbf24',
    fontSize: 14,
    marginRight: 1,
  },
  starHalf: {
    color: '#fbbf24',
    fontSize: 14,
    opacity: 0.6,
    marginRight: 1,
  },
  starEmpty: {
    color: '#e5e7eb',
    fontSize: 14,
    marginRight: 1,
  },
  ratingValue: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 10,
    marginLeft: 70,
  },
});