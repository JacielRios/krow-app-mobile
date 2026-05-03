import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../shared/theme/colors';
import { decodePolyline, LatLng } from '../../../services/googleMaps';

export interface RoutePreviewMapProps {
  origin: LatLng | null;
  destination: LatLng | null;
  /** Polyline encoded de Google Directions API. Si se provee, se dibuja real. */
  encodedPolyline?: string | null;
  /** Markers adicionales (p.ej. pickup/dropoff del pasajero sobre la ruta del conductor). */
  extraMarkers?: Array<{
    id: string;
    point: LatLng;
    color?: string;
    iconName?: string;
  }>;
  style?: ViewStyle;
  height?: number;
}

const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

const computeRegion = (points: LatLng[]) => {
  if (points.length === 0) {
    return {
      latitude: 19.4326,
      longitude: -99.1332,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const deltaLat = Math.max((maxLat - minLat) * 1.6, 0.02);
  const deltaLng = Math.max((maxLng - minLng) * 1.6, 0.02);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: deltaLat,
    longitudeDelta: deltaLng,
  };
};

export const RoutePreviewMap: React.FC<RoutePreviewMapProps> = ({
  origin,
  destination,
  encodedPolyline,
  extraMarkers,
  style,
  height = 220,
}) => {
  const mapRef = useRef<MapView>(null);

  const polylineCoords = useMemo(() => {
    if (encodedPolyline) {
      try {
        return decodePolyline(encodedPolyline);
      } catch {
        return [];
      }
    }
    if (origin && destination) {
      return [toCoord(origin), toCoord(destination)];
    }
    return [];
  }, [encodedPolyline, origin?.lat, origin?.lng, destination?.lat, destination?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const region = useMemo(() => {
    const points: LatLng[] = [];
    if (origin) points.push(origin);
    if (destination) points.push(destination);
    extraMarkers?.forEach(m => points.push(m.point));
    return computeRegion(points);
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, extraMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fit cuando cambian los puntos.
  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineCoords.length === 0) return;
    mapRef.current.fitToCoordinates(polylineCoords, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [polylineCoords]);

  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsCompass={false}
        toolbarEnabled={false}
        pointerEvents="none"
      >
        {origin && (
          <Marker coordinate={toCoord(origin)} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.pin, { backgroundColor: colors.primary }]}>
              <MaterialIcons
                name="trip-origin"
                size={14}
                color={colors.text.inverse}
              />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker
            coordinate={toCoord(destination)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[styles.pin, { backgroundColor: colors.status.error }]}
            >
              <MaterialIcons
                name="place"
                size={14}
                color={colors.text.inverse}
              />
            </View>
          </Marker>
        )}

        {extraMarkers?.map(m => (
          <Marker
            key={m.id}
            coordinate={toCoord(m.point)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.pin,
                { backgroundColor: m.color ?? colors.status.success },
              ]}
            >
              <MaterialIcons
                name={m.iconName ?? 'circle'}
                size={12}
                color={colors.text.inverse}
              />
            </View>
          </Marker>
        ))}

        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.map.route}
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.map.background,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});
