import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Config from 'react-native-config';
import { apiBaseUrl } from '../../core/api/apiClient';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import type {
  LocationSample,
  NavigationRoute,
  RuntimeSnapshot,
} from './protocol';

interface NavigationNative {
  prepare(
    rideId: string,
    routeJson: string,
  ): Promise<{ ready: boolean; routeVersion: number }>;
  start(rideId: string, sessionId: string): Promise<void>;
  stop(): Promise<void>;
  restore(
    rideId: string,
    token: string,
  ): Promise<{
    ready: boolean;
    routeVersion: number;
    sessionId?: string;
  } | null>;
  updateStops(rideId: string, stopsJson: string): Promise<void>;
  configureTransport(
    rideId: string,
    endpoint: string,
    token: string,
    expiresAt: number,
  ): Promise<void>;
  drainLocations(rideId: string): Promise<LocationSample[]>;
  acknowledgeLocations(sequence: number): Promise<void>;
  addListener(event: string): void;
  removeListeners(count: number): void;
}
const native = NativeModules.KrowNavigation as NavigationNative | undefined;
export interface NativeGuidance {
  rideId?: string;
  position?: Pick<LocationSample, 'lat' | 'lng' | 'capturedAt' | 'speedMps'>;
  instruction?: string;
  remainingMeters?: number;
  geometry?: NavigationRoute['geometry'];
  error?: string;
  provisional: boolean;
}
export const nativeNavigation = {
  available: Boolean(native),
  async prepare(snapshot: RuntimeSnapshot) {
    if (!native || !snapshot.route)
      throw new Error(
        'La navegación offline no está disponible en esta compilación.',
      );
    return native.prepare(
      snapshot.rideId,
      JSON.stringify({
        ...snapshot.route,
        routeVersion: snapshot.routeVersion,
        stops: snapshot.stops,
        accessToken: Config.KROW_MAPBOX_PUBLIC_TOKEN ?? '',
      }),
    );
  },
  async start(rideId: string, sessionId: string) {
    if (!native) throw new Error('Navegación nativa no disponible');
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      if (
        permission[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
        PermissionsAndroid.RESULTS.GRANTED
      )
        throw new Error(
          'Activa la ubicación precisa para iniciar la navegación',
        );
    }
    await native.start(rideId, sessionId);
  },
  restore(rideId: string) {
    return (
      native?.restore(rideId, Config.KROW_MAPBOX_PUBLIC_TOKEN ?? '') ??
      Promise.resolve(null)
    );
  },
  async synchronizeTransport(rideId: string) {
    if (!native) return;
    const result = await sessionAdapter.getSession();
    const session = result.data.session;
    if (!session?.expires_at) return;
    await native.configureTransport(
      rideId,
      `${apiBaseUrl().replace(/\/$/, '')}/v2/rides/${rideId}/locations`,
      session.access_token,
      session.expires_at * 1000,
    );
  },
  async updateStops(snapshot: RuntimeSnapshot) {
    if (snapshot.role === 'driver')
      await native?.updateStops(
        snapshot.rideId,
        JSON.stringify(snapshot.stops),
      );
  },
  onGuidance(listener: (guidance: NativeGuidance) => void): () => void {
    if (!native) return () => undefined;
    const subscription = new NativeEventEmitter(native).addListener(
      'krow.navigation',
      listener,
    );
    const location = new NativeEventEmitter(native).addListener(
      'krow.location',
      sample =>
        listener({
          rideId: sample.rideId,
          position: sample,
          provisional: true,
        }),
    );
    return () => {
      subscription.remove();
      location.remove();
    };
  },
  async stop() {
    await native?.stop();
  },
  async flush(
    rideId: string,
    send: (samples: LocationSample[]) => Promise<unknown>,
  ) {
    if (!native) return;
    const samples = await native.drainLocations(rideId);
    if (!samples.length) return;
    const result = (await send(samples)) as {
      accepted?: number;
      durable?: boolean;
    } | null;
    if (!result?.durable || result.accepted !== samples.length)
      throw new Error(
        'El servidor no confirmó la persistencia de las ubicaciones',
      );
    await native.acknowledgeLocations(samples[samples.length - 1].sequence);
  },
  onLocation(listener: () => void): () => void {
    if (!native) return () => undefined;
    const subscription = new NativeEventEmitter(native).addListener(
      'krow.location',
      listener,
    );
    return () => subscription.remove();
  },
};
