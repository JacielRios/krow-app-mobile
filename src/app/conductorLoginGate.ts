import { useSyncExternalStore } from 'react';

let blocking = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * While true, RootNavigator must not show MainNavigator even if a session exists.
 * Used during conductor login so the UI does not flash Home before driver_profiles is verified.
 */
export function setConductorLoginGateBlocking(next: boolean) {
  if (blocking === next) return;
  blocking = next;
  emit();
}

export function getConductorLoginGateBlocking() {
  return blocking;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConductorLoginGateBlocking() {
  return useSyncExternalStore(subscribe, getConductorLoginGateBlocking, getConductorLoginGateBlocking);
}
