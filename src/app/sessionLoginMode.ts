import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionAdapter } from '../core/auth/sessionAdapter';
import { useEffect, useState } from 'react';
export type SessionLoginMode = 'pasajero' | 'conductor';
const listeners = new Set<() => void>();
const preferences = new Map<string, SessionLoginMode>();
const key = (id: string) => '@krow/mode/' + id;
export async function setSessionLoginMode(
  mode: SessionLoginMode,
): Promise<void> {
  const { data } = await sessionAdapter.getSession();
  const id = data.session?.user.id;
  if (!id) return;
  preferences.set(id, mode);
  listeners.forEach(fn => fn());
  await AsyncStorage.setItem(key(id), mode);
}
export async function getSessionLoginMode(): Promise<SessionLoginMode | null> {
  const { data } = await sessionAdapter.getSession();
  const id = data.session?.user.id;
  if (!id) return null;
  const mode = await AsyncStorage.getItem(key(id));
  return mode === 'pasajero' || mode === 'conductor' ? mode : null;
}
export async function clearSessionLoginMode(): Promise<void> {
  preferences.clear();
  listeners.forEach(fn => fn());
}
export function useSessionMode(
  actorId?: string,
  driverAvailable = false,
): SessionLoginMode {
  const [, update] = useState(0);
  useEffect(() => {
    const notify = () => update(n => n + 1);
    listeners.add(notify);
    let alive = true;
    if (actorId)
      void AsyncStorage.getItem(key(actorId))
        .then(mode => {
          if (
            alive &&
            !preferences.has(actorId) &&
            (mode === 'conductor' || mode === 'pasajero')
          ) {
            preferences.set(actorId, mode);
            notify();
          }
        })
        .catch(() => undefined);
    return () => {
      alive = false;
      listeners.delete(notify);
    };
  }, [actorId]);
  return actorId && driverAvailable && preferences.get(actorId) === 'conductor'
    ? 'conductor'
    : 'pasajero';
}
