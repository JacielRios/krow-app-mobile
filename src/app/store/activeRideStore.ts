import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { SessionLoginMode } from '../sessionLoginMode';
import {
  coerceRideStatus,
  type RideStatus,
} from '../../features/ride/types/ride.types';

/**
 * Estado del viaje "activo" del usuario en sesion. Sirve para que al reabrir
 * la app durante un viaje en curso, el RootNavigator pueda redirigir a la
 * pantalla activa correspondiente sin pasar por Home.
 */
export interface ActiveRideState {
  rideId: string | null;
  role: SessionLoginMode | null;
  status: RideStatus | null;
}

const STORAGE_KEY = '@krow:activeRide';

const EMPTY_STATE: ActiveRideState = {
  rideId: null,
  role: null,
  status: null,
};

/**
 * Mini-store sin dependencias externas: un singleton publish/subscribe que
 * podemos consumir desde React via `useActiveRide`. Persiste el estado en
 * AsyncStorage automaticamente, hidratandolo al primer arranque.
 */
class ActiveRideStore {
  private state: ActiveRideState = EMPTY_STATE;
  private listeners = new Set<(s: ActiveRideState) => void>();
  private hydrated = false;
  private hydrating: Promise<void> | null = null;

  /** Hidratar desde AsyncStorage. Idempotente. */
  hydrate(): Promise<void> {
    if (this.hydrated) return Promise.resolve();
    if (this.hydrating) return this.hydrating;
    this.hydrating = AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<ActiveRideState>;
            this.state = {
              ...EMPTY_STATE,
              ...parsed,
              status:
                parsed.status != null
                  ? coerceRideStatus(parsed.status as string)
                  : null,
            };
          } catch {
            this.state = EMPTY_STATE;
          }
        }
      })
      .catch(() => {
        // Si AsyncStorage falla, seguimos con el estado vacio.
      })
      .finally(() => {
        this.hydrated = true;
        this.notify();
      });
    return this.hydrating;
  }

  getState(): ActiveRideState {
    return this.state;
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  setActiveRide(next: Partial<ActiveRideState>): void {
    this.state = { ...this.state, ...next };
    this.persist();
    this.notify();
  }

  clear(): void {
    this.state = EMPTY_STATE;
    this.persist();
    this.notify();
  }

  subscribe(listener: (s: ActiveRideState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l(this.state);
      } catch {
        // Aislar errores de listeners.
      }
    }
  }

  private persist(): void {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch(() => {
      // Best-effort: si falla la escritura no cortamos el flujo.
    });
  }
}

export const activeRideStore = new ActiveRideStore();

/**
 * Hook React que se mantiene sincronizado con el store. Devuelve estado +
 * setters memoizados.
 */
export function useActiveRide() {
  const [state, setState] = useState<ActiveRideState>(() =>
    activeRideStore.getState(),
  );
  const [hydrated, setHydrated] = useState(activeRideStore.isHydrated());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!activeRideStore.isHydrated()) {
      activeRideStore.hydrate().then(() => {
        if (mountedRef.current) {
          setState(activeRideStore.getState());
          setHydrated(true);
        }
      });
    }
    const unsub = activeRideStore.subscribe(s => {
      if (mountedRef.current) setState(s);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  const setActive = useCallback((next: Partial<ActiveRideState>) => {
    activeRideStore.setActiveRide(next);
  }, []);
  const clearActive = useCallback(() => {
    activeRideStore.clear();
  }, []);

  return useMemo(
    () => ({ ...state, hydrated, setActive, clearActive }),
    [state, hydrated, setActive, clearActive],
  );
}

/**
 * Context opcional para escenarios donde queremos forzar un mock en tests.
 * No se usa en producción; el hook por defecto va al singleton.
 */
export const ActiveRideContext = createContext<ReturnType<
  typeof useActiveRide
> | null>(null);

export const useActiveRideContext = () => {
  const ctx = useContext(ActiveRideContext);
  return ctx;
};
