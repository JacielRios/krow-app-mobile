import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../../../services/supabase';

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  /** epoch ms */
  ts: number;
}

interface Options {
  /** rideId del viaje en curso. Cuando es null, no transmite. */
  rideId: string | null;
  /** Localizacion actual del conductor (foreground). */
  location: DriverLocation | null;
  /** Intervalo minimo entre envios (ms). Default 3000. */
  throttleMs?: number;
  /** Distancia minima en metros para reenviar. Default 10m. */
  minDeltaMeters?: number;
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Hook del lado conductor: transmite su `location` foreground por broadcast.
 */
export function useDriverLocationBroadcast({
  rideId,
  location,
  throttleMs = 3000,
  minDeltaMeters = 10,
}: Options): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const lastSentLocRef = useRef<DriverLocation | null>(null);

  useEffect(() => {
    if (!rideId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      lastSentAtRef.current = 0;
      lastSentLocRef.current = null;
      return;
    }

    const ch = supabase.channel(`ride-track:${rideId}`, {
      config: { broadcast: { self: false } },
    });
    ch.subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rideId]);

  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !location) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < throttleMs) return;

    const last = lastSentLocRef.current;
    if (
      last &&
      distanceMeters(last, location) < minDeltaMeters &&
      now - lastSentAtRef.current < throttleMs * 4
    ) {
      return;
    }

    ch.send({
      type: 'broadcast',
      event: 'location',
      payload: location,
    });
    lastSentAtRef.current = now;
    lastSentLocRef.current = location;
  }, [location, throttleMs, minDeltaMeters]);
}
