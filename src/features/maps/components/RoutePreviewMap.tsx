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
import { decodePolyline, isValidPoint, LatLng } from '../api/mapsApi';
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
    label?: string;
    selected?: boolean;
    accessibilityLabel?: string;
    onPress?: () => void;
  }>;
  interactive?: boolean;
  style?: ViewStyle;
  height?: number;
  trackingMode?: boolean;
  viewportInsets?: { top: number; bottom: number };
  vehicle?: { point: LatLng; stale: boolean; heading?: number };
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
  origin: originInput,
  destination: destinationInput,
  encodedPolyline,
  extraMarkers: markerInput,
  interactive = false,
  style,
  height = 220,
  trackingMode = false,
  viewportInsets,
  vehicle: vehicleInput,
  onOriginDrag,
  onDestinationDrag,
  onMapPress,
}) => {
  const mapRef = useRef<MapView>(null);
  // Never send incomplete API/GPS coordinates to a native map command.
  const origin = isValidPoint(originInput) ? originInput : null;
  const destination = isValidPoint(destinationInput) ? destinationInput : null;
  const extraMarkers = useMemo(
    () =>
      (Array.isArray(markerInput) ? markerInput : []).filter(
        marker => !!marker && isValidPoint(marker.point),
      ),
    [markerInput],
  );
  const vehicle =
    vehicleInput && isValidPoint(vehicleInput.point) ? vehicleInput : undefined;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 220;
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const mounted = useRef(true);
  const readyCanvas = useRef<string | null>(null);
  const loadedCanvas = useRef<string | null>(null);
  const lastAutomaticFrame = useRef<string | null>(null);
  const [following, setFollowing] = useState(true);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const { theme, motionEnabled } = useTheme();
  const canvasRouteKey = trackingMode ? 'tracking' : encodedPolyline;
  const canvasKey = `${mapAttempt}:${canvasRouteKey ?? 'pending'}`;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      readyCanvas.current = null;
      loadedCanvas.current = null;
    };
  }, []);
  // Recreate the native canvas when the resolved route replaces its provisional
  // endpoints; Fabric may retain the previous native overlay otherwise.
  useEffect(() => {
    setReady(false);
    setLoaded(false);
    setLoadFailed(false);
  }, [canvasRouteKey]);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setLoadFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [loaded, mapAttempt, canvasRouteKey]);
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

  const cameraReady =
    ready && loaded && layout.width >= 48 && layout.height >= 48;
  const executeCamera = useCallback(
    (command: () => void) => {
      if (
        !mounted.current ||
        !cameraReady ||
        readyCanvas.current !== canvasKey ||
        loadedCanvas.current !== canvasKey
      )
        return;
      try {
        command();
      } catch {
        // A detached native view must leave the trip controls available.
        if (mounted.current) setLoadFailed(true);
      }
    },
    [cameraReady, canvasKey],
  );
  const frameRoute = useCallback(() => {
    if (!mapRef.current) return;
    if (visibleCoords.length === 0) return;
    if (visibleCoords.length === 1) {
      executeCamera(() =>
        mapRef.current?.animateCamera(
          { center: visibleCoords[0] },
          { duration: motionEnabled ? 250 : 0 },
        ),
      );
      return;
    }
    // fitToCoordinates throws in the Android SDK before layout, or when its
    // padding consumes the map. Wait for layout/tiles and bound extra padding.
    const horizontalPadding = Math.min(
      24,
      Math.max(0, Math.floor((layout.width - 120) / 2)),
    );
    executeCamera(() =>
      mapRef.current?.fitToCoordinates(visibleCoords, {
        edgePadding: {
          top: 12,
          right: horizontalPadding,
          bottom: 12,
          left: horizontalPadding,
        },
        animated: motionEnabled,
      }),
    );
  }, [visibleCoords, executeCamera, motionEnabled, layout.width]);
  const hasVehicle = !!vehicle;
  const vehicleLat = vehicle?.point.lat;
  const vehicleLng = vehicle?.point.lng;
  const vehicleStale = vehicle?.stale;
  const paddingBudget = Math.max(0, (layout.height || safeHeight) - 144);
  const viewportTop = Math.min(
    paddingBudget,
    Math.max(0, Number.isFinite(viewportInsets?.top) ? viewportInsets!.top : 0),
  );
  const viewportBottom = Math.min(
    paddingBudget - viewportTop,
    Math.max(
      0,
      Number.isFinite(viewportInsets?.bottom) ? viewportInsets!.bottom : 0,
    ),
  );
  const frameKey = `${canvasKey}:${layout.width}:${
    layout.height
  }:${viewportTop}:${viewportBottom}:${visibleCoords
    .map(point => `${point.latitude},${point.longitude}`)
    .join(';')}`;
  useEffect(() => {
    if (
      hasVehicle ||
      !cameraReady ||
      readyCanvas.current !== canvasKey ||
      loadedCanvas.current !== canvasKey ||
      lastAutomaticFrame.current === frameKey
    )
      return;
    lastAutomaticFrame.current = frameKey;
    frameRoute();
  }, [frameRoute, hasVehicle, cameraReady, canvasKey, frameKey]);
  useEffect(() => {
    if (
      vehicleLat == null ||
      vehicleLng == null ||
      !cameraReady ||
      vehicleStale
    )
      return;
    const center = { latitude: vehicleLat, longitude: vehicleLng };
    // The marker follows its coordinate prop. Avoid concurrent Fabric marker
    // animation commands while the native marker is being attached/removed.
    if (following)
      executeCamera(() =>
        mapRef.current?.animateCamera(
          { center, zoom: 16 },
          { duration: motionEnabled ? 600 : 0 },
        ),
      );
  }, [
    vehicleLat,
    vehicleLng,
    vehicleStale,
    cameraReady,
    executeCamera,
    following,
    motionEnabled,
    viewportTop,
    viewportBottom,
  ]);

  return (
    <View
      style={[
        styles.wrap,
        { height: safeHeight, backgroundColor: theme.colors.surfaceOverlay },
        style,
      ]}
      onLayout={event => {
        const { width, height: measuredHeight } = event.nativeEvent.layout;
        if (Number.isFinite(width) && Number.isFinite(measuredHeight))
          setLayout({
            width: Math.max(0, width),
            height: Math.max(0, measuredHeight),
          });
      }}
    >
      <MapView
        key={canvasKey}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        mapPadding={{
          top: viewportTop,
          bottom: viewportBottom,
          left: 0,
          right: 0,
        }}
        onMapReady={() => {
          if (!mounted.current) return;
          readyCanvas.current = canvasKey;
          setReady(true);
        }}
        onMapLoaded={() => {
          if (!mounted.current) return;
          loadedCanvas.current = canvasKey;
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
        onPanDrag={() => setFollowing(false)}
        onPress={
          onMapPress
            ? event =>
                isValidPoint({
                  lat: event.nativeEvent.coordinate.latitude,
                  lng: event.nativeEvent.coordinate.longitude,
                }) &&
                onMapPress({
                  lat: event.nativeEvent.coordinate.latitude,
                  lng: event.nativeEvent.coordinate.longitude,
                })
            : undefined
        }
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {vehicle && (
          <Marker
            coordinate={toCoord(vehicle.point)}
            rotation={Number.isFinite(vehicle.heading) ? vehicle.heading! : 0}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel={
              vehicle.stale
                ? 'Última ubicación del vehículo'
                : 'Vehículo en vivo'
            }
          >
            <View
              style={{
                backgroundColor: vehicle.stale
                  ? theme.colors.textMuted
                  : theme.colors.primary,
                borderRadius: 24,
                padding: 8,
                borderWidth: 3,
                borderColor: theme.colors.surfaceRaised,
              }}
            >
              <MaterialIcons
                name="navigation"
                size={22}
                color={theme.colors.textInverse}
              />
            </View>
          </Marker>
        )}
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
              {m.label ? (
                <Text
                  style={{
                    color: theme.colors.textInverse,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {m.label}
                </Text>
              ) : (
                <MaterialIcons
                  name={m.iconName ?? 'circle'}
                  size={12}
                  color={theme.colors.textInverse}
                />
              )}
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
            {
              paddingTop: viewportInsets?.top ?? 0,
              paddingBottom: viewportInsets?.bottom ?? 0,
            },
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
            { paddingTop: viewportTop, paddingBottom: viewportBottom },
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
            { top: viewportTop + 12 },
            { backgroundColor: theme.colors.surfaceRaised },
          ]}
          icon={
            <MaterialIcons
              name="center-focus-strong"
              size={22}
              color={theme.colors.primary}
            />
          }
          onPress={() => {
            setFollowing(false);
            frameRoute();
          }}
        />
      )}
      {loaded && vehicle && (
        <Button
          title={following ? 'Siguiendo vehículo' : 'Seguir vehículo'}
          variant="outline"
          fullWidth={false}
          style={{
            position: 'absolute',
            left: 12,
            bottom: viewportBottom + 12,
            backgroundColor: theme.colors.surfaceRaised,
          }}
          onPress={() => setFollowing(true)}
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
