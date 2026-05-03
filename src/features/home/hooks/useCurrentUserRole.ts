import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import {
  getSessionLoginMode,
  SessionLoginMode,
} from '../../../app/sessionLoginMode';

export interface CurrentUser {
  userId: string;
  email: string | null;
  displayName: string;
  role: SessionLoginMode;
}

export interface UseCurrentUserRoleResult {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function deriveDisplayName(
  email: string | null | undefined,
  metadata: Record<string, any> | undefined,
): string {
  const fromMetadata =
    metadata?.full_name ?? metadata?.name ?? metadata?.first_name;
  if (typeof fromMetadata === 'string' && fromMetadata.trim().length > 0) {
    return fromMetadata.trim();
  }
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return 'Usuario';
}

// TODO: la fuente de verdad del rol debería ser la presencia de un registro
// en `driver_profiles` para `auth.uid()` (con `status='approved'`), no
// `getSessionLoginMode()` en AsyncStorage. La spec del flujo de rides asume
// que este hook ya consulta `driver_profiles`, pero hoy no lo hace.
// Pendiente refactorizar para que `role` se derive de Supabase.
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

      const [{ data: authData, error: authError }, role] = await Promise.all([
        supabase.auth.getUser(),
        getSessionLoginMode(),
      ]);

      if (!active) return;

      if (authError) {
        setUser(null);
        setError(authError.message);
        setLoading(false);
        return;
      }

      const authUser = authData?.user;
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (!role) {
        // Sesión válida pero sin rol persistido (caso raro: AsyncStorage limpiado).
        // El RootNavigator se encarga de redirigir; solo reportamos el inconsistente.
        setUser(null);
        setError('Sesión sin rol asignado. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      setUser({
        userId: authUser.id,
        email: authUser.email ?? null,
        displayName: deriveDisplayName(
          authUser.email,
          authUser.user_metadata as Record<string, any> | undefined,
        ),
        role,
      });
      setLoading(false);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) load();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [reloadTick]);

  return { user, loading, error, reload };
}
