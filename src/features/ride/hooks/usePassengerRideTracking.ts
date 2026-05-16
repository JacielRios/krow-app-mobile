import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../../../services/supabase';
import type { DriverLocation } from './useDriverLocationBroadcast';

export interface DriverTrackingState {
  location: DriverLocation | null;
  /** Tiempo (ms) desde el ultimo broadcast recibido. null si nunca llego uno. */
  staleness: number | null;
  /** True si hace mas de 15s que no recibimos location. */
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 15_000;

/**
 * Suscripcion del lado pasajero al canal broadcast del conductor.
 */
export function usePassengerRideTracking(
  rideId: string | null,
): DriverTrackingState {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastReceivedAtRef = useRef<number | null>(null);

  useEffect(() => {
    setLocation(null);
    lastReceivedAtRef.current = null;
    if (!rideId) return;

    const ch = supabase.channel(`ride-track:${rideId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'location' }, payload => {
      const loc = payload?.payload as DriverLocation | undefined;
      if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        return;
      }
      lastReceivedAtRef.current = Date.now();
      setLocation(loc);
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [rideId]);

  const staleness =
    lastReceivedAtRef.current != null ? now - lastReceivedAtRef.current : null;
  const isStale = staleness != null && staleness > STALE_THRESHOLD_MS;

  return { location, staleness, isStale };
}
