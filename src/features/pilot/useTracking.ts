import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { apiBaseUrl, ApiError } from '../../core/api/apiClient';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { pilotApi, type TrackingSnapshot } from './pilotApi';
import { readTrackingSnapshot } from './trackingSnapshot';
export function positionFreshness(capturedAt?: string, now = Date.now()) {
  if (!capturedAt || !Number.isFinite(Date.parse(capturedAt)))
    return { state: 'unavailable', ageSeconds: null } as const;
  const ageSeconds = Math.max(
    0,
    Math.floor((now - Date.parse(capturedAt)) / 1000),
  );
  return {
    state: ageSeconds <= 10 ? 'live' : ageSeconds <= 30 ? 'delayed' : 'stale',
    ageSeconds,
  } as const;
}
export function latestTrackingPosition(
  current: TrackingSnapshot | undefined,
  incoming: TrackingSnapshot,
): TrackingSnapshot {
  if (
    current?.observedAt &&
    incoming.observedAt &&
    Date.parse(incoming.observedAt) < Date.parse(current.observedAt)
  ) {
    return current;
  }
  if (
    current?.position &&
    incoming.position &&
    Date.parse(current.position.capturedAt) >
      Date.parse(incoming.position.capturedAt)
  ) {
    // Keep newly confirmed stops, but a slow REST response cannot rewind GPS.
    return { ...incoming, position: current.position, etaSeconds: null };
  }
  return incoming;
}
export function useTracking(
  rideId: string,
  actorId: string | undefined,
  enabled: boolean,
) {
  const focused = useIsFocused();
  const cache = useQueryClient();
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [connected, setConnected] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', s =>
      setForeground(s === 'active'),
    );
    return () => sub.remove();
  }, []);
  const q = useQuery({
    queryKey: ['tracking', actorId, rideId],
    enabled: enabled && focused && foreground && !revoked,
    queryFn: async () => {
      const incoming = readTrackingSnapshot(
        await pilotApi.tracking(rideId),
        rideId,
      );
      return latestTrackingPosition(
        cache.getQueryData<TrackingSnapshot>(['tracking', actorId, rideId]),
        incoming,
      );
    },
    retry: (n, e) =>
      !(e instanceof ApiError && [401, 403].includes(e.status)) && n < 1,
    // REST also backs up a connected socket that stops delivering snapshots.
    refetchInterval: 5000,
  });
  const refetch = q.refetch;
  useEffect(() => {
    setRevoked(false);
  }, [actorId, rideId]);
  useEffect(() => {
    if (q.error instanceof ApiError && [401, 403].includes(q.error.status)) {
      setRevoked(true);
      cache.removeQueries({ queryKey: ['tracking', actorId, rideId] });
    }
  }, [q.error, cache, actorId, rideId]);
  useEffect(() => {
    if (!enabled || !focused || !foreground || !actorId || revoked) return;
    let alive = true;
    let socket: ReturnType<typeof io> | undefined;
    void sessionAdapter
      .getSession()
      .then(({ data }) => {
        if (!alive || !data.session) return;
        socket = io(apiBaseUrl() + '/v1/tracking', {
          transports: ['websocket'],
          auth: { rideId, token: data.session.access_token },
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });
        socket.on('tracking', (message: unknown) => {
          if (alive) {
            let snapshot: TrackingSnapshot;
            try {
              snapshot = readTrackingSnapshot(message, rideId);
            } catch {
              // Recover using the REST contract rather than throwing from a listener.
              setConnected(false);
              void refetch();
              return;
            }
            setConnected(true);
            cache.setQueryData<TrackingSnapshot>(
              ['tracking', actorId, rideId],
              current => latestTrackingPosition(current, snapshot),
            );
          }
        });
        socket.on('disconnect', () => {
          if (alive) setConnected(false);
        });
        socket.on('unavailable', () => {
          if (alive) {
            setConnected(false);
            void refetch();
          }
        });
      })
      .catch(() => {
        if (alive) setConnected(false);
      });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      socket?.removeAllListeners();
      socket?.disconnect();
      setConnected(false);
      clearInterval(timer);
    };
  }, [enabled, focused, foreground, rideId, actorId, cache, revoked, refetch]);
  const snapshot = enabled && !revoked ? q.data : null;
  return {
    snapshot,
    error: q.error,
    refresh: q.refetch,
    connected,
    ...positionFreshness(snapshot?.position?.capturedAt, now),
  };
}
