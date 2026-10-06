import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, IconButton } from '../../../shared/components/ui-v2';
import { decodePolyline, LatLng } from '../api/mapsApi';
import { useTheme } from '../../../shared/theme/ThemeProvider';

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
    selected?: boolean;
    accessibilityLabel?: string;
    onPress?: () => void;
  }>;
  interactive?: boolean;
  style?: ViewStyle;
  height?: number;
  onOriginDrag?: (point: LatLng) => void;
  onDestinationDrag?: (point: LatLng) => void;
  onMapPress?: (point: LatLng) => void;
}

const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

const computeRegion = (points: LatLng[]) => {
  if (points.length === 0) {
    return {
      latitude: 25.6866,
      longitude: -100.3161,
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
  interactive = false,
  style,
  height = 220,
  onOriginDrag,
  onDestinationDrag,
  onMapPress,
}) => {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const { theme, motionEnabled } = useTheme();
  // Recreate the native canvas when the resolved route replaces its provisional
  // endpoints; Fabric may retain the previous native overlay otherwise.
  useEffect(() => {
    setReady(false);
    setLoaded(false);
    setLoadFailed(false);
  }, [encodedPolyline]);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setLoadFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [loaded, mapAttempt, encodedPolyline]);
  const retryMap = () => {
    setReady(false);
    setLoaded(false);
    setLoadFailed(false);
    setMapAttempt(attempt => attempt + 1);
  };
  const mapStyle = useMemo(
    () => [
      {
        elementType: 'geometry',
        stylers: [{ color: theme.colors.surfaceOverlay }],
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: theme.colors.textSecondary }],
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: theme.colors.surface }],
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: theme.colors.surface }],
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: theme.colors.primarySoft }],
      },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    ],
    [theme],
  );

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
  }, [encodedPolyline, origin, destination]);

  const region = useMemo(() => {
    const points: LatLng[] = [];
    if (origin) points.push(origin);
    if (destination) points.push(destination);
    extraMarkers?.forEach(m => points.push(m.point));
    return computeRegion(points);
  }, [origin, destination, extraMarkers]);

  const visibleCoords = useMemo(() => {
    const byCoordinate = new Map<
      string,
      { latitude: number; longitude: number }
    >();
    polylineCoords.forEach(point =>
      byCoordinate.set(`${point.latitude}:${point.longitude}`, point),
    );
    [origin, destination].forEach(point => {
      if (point) byCoordinate.set(`${point.lat}:${point.lng}`, toCoord(point));
    });
    extraMarkers?.forEach(marker => {
      const point = toCoord(marker.point);
      byCoordinate.set(`${point.latitude}:${point.longitude}`, point);
    });
    return [...byCoordinate.values()];
  }, [extraMarkers, polylineCoords, origin, destination]);

  const frameRoute = useCallback(() => {
    if (!mapRef.current || !ready) return;
    if (visibleCoords.length === 0) return;
    if (visibleCoords.length === 1) {
      mapRef.current.animateCamera(
        { center: visibleCoords[0] },
        { duration: motionEnabled ? 250 : 0 },
      );
      return;
    }
    mapRef.current.fitToCoordinates(visibleCoords, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: motionEnabled,
    });
  }, [visibleCoords, ready, motionEnabled]);
  useEffect(frameRoute, [frameRoute]);

  return (
    <View
      style={[
        styles.wrap,
        { height, backgroundColor: theme.colors.surfaceOverlay },
        style,
      ]}
    >
      <MapView
        key={`${mapAttempt}:${encodedPolyline ?? 'pending'}`}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        onMapReady={() => setReady(true)}
        onMapLoaded={() => {
          setLoaded(true);
          setLoadFailed(false);
        }}
        customMapStyle={mapStyle}
        showsCompass={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={
          onMapPress
            ? event =>
                onMapPress({
                  lat: event.nativeEvent.coordinate.latitude,
                  lng: event.nativeEvent.coordinate.longitude,
                })
            : undefined
        }
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {origin && (
          <Marker
            coordinate={toCoord(origin)}
            anchor={{ x: 0.5, y: 0.5 }}
            draggable={Boolean(onOriginDrag)}
            onDragEnd={event =>
              onOriginDrag?.({
                lat: event.nativeEvent.coordinate.latitude,
                lng: event.nativeEvent.coordinate.longitude,
              })
            }
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.surfaceRaised,
                },
              ]}
            >
              <MaterialIcons
                name="trip-origin"
                size={14}
                color={theme.colors.textInverse}
              />
            </View>
          </Marker>
        )}

        {destination && (
          <Marker
            coordinate={toCoord(destination)}
            anchor={{ x: 0.5, y: 0.5 }}
            draggable={Boolean(onDestinationDrag)}
            onDragEnd={event =>
              onDestinationDrag?.({
                lat: event.nativeEvent.coordinate.latitude,
                lng: event.nativeEvent.coordinate.longitude,
              })
            }
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: theme.colors.status.error,
                  borderColor: theme.colors.surfaceRaised,
                },
              ]}
            >
              <MaterialIcons
                name="place"
                size={14}
                color={theme.colors.textInverse}
              />
            </View>
          </Marker>
        )}

        {extraMarkers?.map(m => (
          <Marker
            key={m.id}
            coordinate={toCoord(m.point)}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={m.onPress}
            accessibilityLabel={m.accessibilityLabel}
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: m.color ?? theme.colors.status.success,
                  borderColor: m.selected
                    ? theme.colors.primary
                    : theme.colors.surfaceRaised,
                  transform: [{ scale: m.selected ? 1.15 : 1 }],
                },
              ]}
            >
              <MaterialIcons
                name={m.iconName ?? 'circle'}
                size={12}
                color={theme.colors.textInverse}
              />
            </View>
          </Marker>
        ))}

        {polylineCoords.length >= 2 && (
          <Polyline
            key={
              encodedPolyline ||
              `pending:${origin?.lat},${origin?.lng}:${destination?.lat},${destination?.lng}`
            }
            coordinates={polylineCoords}
            strokeColor={theme.colors.primary}
            strokeWidth={4}
            zIndex={2}
            lineDashPattern={encodedPolyline ? undefined : [6, 6]}
          />
        )}
      </MapView>
      {!loaded && !loadFailed && (
        <View
          pointerEvents="none"
          style={[
            styles.state,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary }}>
            Cargando mapa…
          </Text>
        </View>
      )}
      {loadFailed && (
        <View
          style={[
            styles.state,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}
        >
          <MaterialIcons name="map" size={28} color={theme.colors.primary} />
          <Text
            accessibilityRole="alert"
            style={[styles.stateTitle, { color: theme.colors.textPrimary }]}
          >
            No pudimos cargar el mapa
          </Text>
          <Text
            style={[styles.stateHint, { color: theme.colors.textSecondary }]}
          >
            Revisa tu conexión. También puedes elegir el lugar por su nombre.
          </Text>
          <Button
            title="Reintentar mapa"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={retryMap}
          />
        </View>
      )}
      {loaded && interactive && visibleCoords.length > 0 && (
        <IconButton
          accessibilityLabel="Centrar recorrido"
          variant="outline"
          style={[
            styles.recenter,
            { backgroundColor: theme.colors.surfaceRaised },
          ]}
          icon={
            <MaterialIcons
              name="center-focus-strong"
              size={22}
              color={theme.colors.primary}
            />
          }
          onPress={frameRoute}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  state: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  stateTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  stateHint: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  recenter: { position: 'absolute', top: 12, right: 12 },
});
