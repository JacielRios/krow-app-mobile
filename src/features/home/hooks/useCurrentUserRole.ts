import { useCallback, useEffect, useState } from 'react';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
import { userApi } from '../../auth/api/userApi';
import { SessionLoginMode } from '../../../app/sessionLoginMode';

// BREAKING: sessionLoginMode.ts ya no determina el rol. La fuente de verdad
// ahora es la presencia de un registro en `driver_profiles` para
// `auth.uid()`. El módulo `app/sessionLoginMode.ts` queda como deuda técnica
// (`LoginScreen` aún escribe ahí, pero ningún hook lee ese valor para
// decidir el rol). Cuando se limpie esa deuda, eliminar también
// `setSessionLoginMode`/`getSessionLoginMode`/`clearSessionLoginMode`.

export interface CurrentUser {
  userId: string;
  email: string | null;
  displayName: string;
  /**
   * Rol del usuario en sesión.
   * - 'conductor': existe `driver_profiles` para su `auth.uid()`.
   * - 'pasajero': no existe registro en `driver_profiles`.
   *
   * Se mantiene el tipo `SessionLoginMode` (`'conductor' | 'pasajero'`) por
   * compatibilidad con consumidores históricos (`HomeScreen`,
   * `useRecentRides`, `RecentRidesTable`). El nuevo flujo de rides usa
   * 'driver'/'passenger' (ver `useActiveRide`).
   */
  role: SessionLoginMode;
  /**
   * `driver_profiles.driver_id` cuando `role === 'conductor'`. `null` para
   * pasajeros. Se expone como campo aditivo para que otros hooks (p.ej.
   * `useActiveRide`) no tengan que repetir la query a `driver_profiles`.
   */
  driverId: string | null;
}

export interface UseCurrentUserRoleResult {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function deriveDisplayName(email: string | null | undefined, fullName?: string | null): string {
  if (fullName?.trim()) return fullName.trim();
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return 'Usuario';
}

export function useCurrentUserRole(): UseCurrentUserRoleResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick(t => t + 1), []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const profile = await userApi.me();
      if (!active) return;
      const role: SessionLoginMode = profile.role;

      setUser({
        userId: profile.userId,
        email: profile.email,
        displayName: deriveDisplayName(profile.email, profile.fullName),
        role,
        driverId: profile.driverProfile?.driverId ?? null,
      });
      setLoading(false);
    };

    load().catch((reason: any) => {
      if (active) {
        setUser(null);
        setError(reason?.message ?? 'No se pudo cargar el perfil');
        setLoading(false);
      }
    });

    const unsubscribe = sessionAdapter.onAuthStateChange(() => {
      if (active) load().catch(() => undefined);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadTick]);

  return { user, loading, error, reload };
}
