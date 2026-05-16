import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../services/supabase';
import {
  getSessionLoginMode,
  setSessionLoginMode,
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

/**
 * Fuente de verdad del rol basada en `driver_profiles` en Supabase.
 *
 * - Si el usuario tiene un registro en `driver_profiles` con `status = 'approved'`
 *   → `role = 'conductor'`
 * - Sino → `role = 'pasajero'`
 *
 * AsyncStorage se usa como cache rápida para evitar flash al montar, pero
 * Supabase siempre sobreescribe el valor.
 */
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

      // 1. Auth user
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

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

      // 2. Determinar rol consultando driver_profiles
      let role: SessionLoginMode;

      try {
        const { data: driverProfile, error: dpError } = await supabase
          .from('driver_profiles')
          .select('driver_id, status')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!active) return;

        if (dpError) {
          // Si falla la consulta a driver_profiles, intentar fallback a AsyncStorage
          const cachedRole = await getSessionLoginMode();
          role = cachedRole ?? 'pasajero';
        } else if (driverProfile && driverProfile.status === 'approved') {
          role = 'conductor';
        } else {
          role = 'pasajero';
        }
      } catch {
        // Offline / error de red: fallback a AsyncStorage
        const cachedRole = await getSessionLoginMode();
        role = cachedRole ?? 'pasajero';
      }

      if (!active) return;

      // 3. Sincronizar AsyncStorage con la fuente de verdad
      await setSessionLoginMode(role).catch(() => {});

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
