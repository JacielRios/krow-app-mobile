import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { apiBaseUrl, ApiError } from '../../core/api/apiClient';
import { sessionAdapter } from '../../core/auth/sessionAdapter';
import { runtimeApi, newCommandId } from './runtimeApi';
import { offlineCommands, type PendingCommand } from './offlineCommands';
import { nativeNavigation } from './nativeNavigation';
import { projectCommand } from './offlineProjection';
import { sessionCache } from './sessionCache';
import type {
  RuntimeAction,
  RuntimeSnapshot,
  VehiclePosition,
} from './protocol';

export function useRuntimeRide(rideId: string) {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [pending, setPending] = useState<PendingCommand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const actor = useRef<string | null>(null),
    current = useRef<RuntimeSnapshot | null>(null);
  const socket = useRef<Socket | null>(null),
    mounted = useRef(true),
    synchronizing = useRef(false),
    sending = useRef(false),
    enqueuing = useRef(false);
  const base = useRef<RuntimeSnapshot | null>(null);
  const show = useCallback(async () => {
    if (!actor.current || !base.current || !mounted.current) return;
    const items = (await offlineCommands.list(actor.current)).filter(
      x => x.rideId === rideId,
    );
    let projected = base.current;
    for (const item of items) {
      if (item.state === 'conflict') break;
      try {
        projected = projectCommand(projected, item.command);
      } catch {
        break;
      }
    }
    current.current = projected;
    setSnapshot(projected);
    setPending(items);
    await nativeNavigation.updateStops(projected);
  }, [rideId]);
  const refresh = useCallback(async () => {
    if (synchronizing.current) return;
    synchronizing.current = true;
    try {
      const session = await sessionAdapter.getSession();
      const nextActor = session.data.session?.user.id ?? null;
      if (actor.current !== nextActor) {
        base.current = null;
        current.current = null;
        setSnapshot(null);
        setPending([]);
        if (actor.current) {
          socket.current?.disconnect();
          await nativeNavigation.stop();
        }
      }
      actor.current = nextActor;
      if (!actor.current)
        throw new Error('Inicia sesión para recuperar tu viaje');
      if (!base.current) {
        base.current = await sessionCache.read(actor.current, rideId);
        await show();
      }
      const items = await offlineCommands.list(actor.current);
      for (const item of items.filter(x => x.rideId === rideId)) {
        if (item.state === 'conflict') break;
        try {
          await runtimeApi.command(rideId, item.command);
          // An acknowledged command is persisted even if the following snapshot request fails.
          if (base.current?.version === item.command.expectedVersion) {
            try {
              base.current = projectCommand(base.current, item.command);
              await sessionCache.write(actor.current, base.current);
            } catch {
              /* Non-operational commands require an authoritative snapshot. */
            }
          }
          await offlineCommands.resolve(actor.current, item.command.commandId);
        } catch (cause) {
          if (
            cause instanceof ApiError &&
            [400, 403, 404, 409, 422].includes(cause.status)
          )
            await offlineCommands.conflictRide(actor.current, rideId);
          else throw cause;
          break;
        }
      }
      const result = await runtimeApi.snapshot(rideId);
      if (result.role === 'driver' && result.state === 'in_progress')
        await nativeNavigation
          .synchronizeTransport(rideId)
          .catch(() => undefined);
      if (mounted.current) {
        base.current = result;
        await sessionCache.write(actor.current, result);
        await show();
        setError(null);
      }
      if (['completed', 'cancelled', 'interrupted'].includes(result.state)) {
        await nativeNavigation.stop();
        socket.current?.disconnect();
      }
    } catch (cause) {
      if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
        base.current = null;
        current.current = null;
        setSnapshot(null);
        setPending([]);
        socket.current?.disconnect();
        await nativeNavigation.stop();
      }
      await show();
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo actualizar el viaje',
        );
    } finally {
      synchronizing.current = false;
    }
  }, [rideId, show]);

  useEffect(() => {
    mounted.current = true;
    if (base.current?.rideId !== rideId) {
      base.current = null;
      current.current = null;
      setSnapshot(null);
      setPending([]);
    }
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let connecting = false;
    const connect = async () => {
      if (
        !mounted.current ||
        connecting ||
        AppState.currentState !== 'active' ||
        (current.current &&
          ['completed', 'cancelled', 'interrupted'].includes(
            current.current.state,
          ))
      )
        return;
      connecting = true;
      try {
        const session = await sessionAdapter.getSession();
        if (!session.data.session || !mounted.current) return;
        socket.current?.removeAllListeners();
        socket.current?.disconnect();
        const transport = io(apiBaseUrl(), {
          path: '/v2/socket.io',
          transports: ['websocket'],
          reconnection: false,
          timeout: 5000,
          auth: { token: session.data.session.access_token, rideId },
        });
        socket.current = transport;
        transport.on('connect', () => {
          setConnected(true);
          void refresh();
        });
        const retry = () => {
          if (
            !mounted.current ||
            (current.current &&
              ['completed', 'cancelled', 'interrupted'].includes(
                current.current.state,
              ))
          )
            return;
          setConnected(false);
          clearTimeout(reconnect);
          reconnect = setTimeout(() => {
            void connect();
          }, 2000 + Math.random() * 2000);
        };
        transport.on('disconnect', retry);
        transport.on('connect_error', retry);
        transport.on('ride.changed', () => {
          void refresh();
        });
        transport.on('position', (position: VehiclePosition) => {
          setSnapshot(previous => {
            if (
              !previous ||
              (previous.position?.sessionId === position.sessionId &&
                previous.position.sequence >= position.sequence)
            )
              return previous;
            return {
              ...previous,
              position,
              tracking:
                Date.now() - Date.parse(position.capturedAt) < 30000
                  ? 'live'
                  : 'stale',
            };
          });
        });
      } catch {
        if (mounted.current) setConnected(false);
      } finally {
        connecting = false;
      }
    };
    void refresh();
    void connect();
    const flush = () => {
      if (sending.current || current.current?.role !== 'driver') return;
      sending.current = true;
      void nativeNavigation
        .flush(rideId, samples => runtimeApi.locations(rideId, samples))
        .catch(() => undefined)
        .finally(() => {
          sending.current = false;
        });
    };
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
        flush();
      }
    }, 15000);
    const state = AppState.addEventListener('change', value => {
      if (value === 'active') {
        void refresh();
        void connect();
      } else socket.current?.disconnect();
    });
    const unsubscribe = nativeNavigation.onLocation(() => {
      if (sending.current || current.current?.role !== 'driver') return;
      sending.current = true;
      void nativeNavigation
        .flush(rideId, samples => runtimeApi.locations(rideId, samples))
        .catch(() => undefined)
        .finally(() => {
          sending.current = false;
        });
    });
    return () => {
      mounted.current = false;
      clearTimeout(reconnect);
      clearInterval(interval);
      state.remove();
      unsubscribe();
      socket.current?.removeAllListeners();
      socket.current?.disconnect();
    };
  }, [rideId, refresh]);

  const command = useCallback(
    async (
      action: RuntimeAction,
      options: { stopId?: string; bookingId?: string; reason?: string } = {},
    ) => {
      if (!current.current || !actor.current || enqueuing.current) return;
      enqueuing.current = true;
      setBusy(true);
      try {
        const items = await offlineCommands.list(actor.current);
        if (items.some(x => x.rideId === rideId && x.state === 'conflict'))
          throw new Error('Primero resuelve las acciones en conflicto');
        const item: PendingCommand = {
          rideId,
          state: 'pending',
          createdAt: new Date().toISOString(),
          command: {
            commandId: newCommandId(),
            expectedVersion: current.current.version,
            action,
            ...options,
          },
        };
        if (
          ['arrive', 'depart', 'board', 'dropoff', 'no_show'].includes(action)
        )
          projectCommand(current.current, item.command);
        else if (items.some(x => x.rideId === rideId))
          throw new Error('Sincroniza las acciones antes de continuar');
        await offlineCommands.add(actor.current, item);
        await show();
        await refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo guardar la acción',
        );
      } finally {
        setBusy(false);
        enqueuing.current = false;
      }
    },
    [rideId, refresh, show],
  );
  const dismissConflict = async (id: string) => {
    if (actor.current) {
      await offlineCommands.resolve(actor.current, id);
      await refresh();
    }
  };
  return {
    snapshot,
    pending,
    error,
    connected,
    busy,
    refresh,
    command,
    dismissConflict,
  };
}
