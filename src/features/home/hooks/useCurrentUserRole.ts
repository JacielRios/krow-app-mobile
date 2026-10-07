import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionAdapter } from '../../../core/auth/sessionAdapter';
import { userApi } from '../../auth/api/userApi';
import {
  useSessionMode,
  type SessionLoginMode,
} from '../../../app/sessionLoginMode';
export interface CurrentUser {
  userId: string;
  email: string | null;
  displayName: string;
  role: SessionLoginMode;
  driverId: string | null;
  driverStatus: string | null;
  canPublishRides: boolean;
}
export interface UseCurrentUserRoleResult {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}
export function useCurrentUserRole(): UseCurrentUserRoleResult {
  const [actor, setActor] = useState<string>();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let receivedAuthEvent = false;
    void sessionAdapter
      .getSession()
      .then(({ data, error }) => {
        if (!alive || receivedAuthEvent) return;
        if (error) throw error;
        setActor(data.session?.user.id);
        setSessionReady(true);
      })
      .catch(() => {
        if (alive && !receivedAuthEvent) {
          setSessionReady(true);
          setSessionError(
            'No pudimos recuperar tu sesión. Vuelve a iniciar sesión.',
          );
        }
      });
    const unsub = sessionAdapter.onAuthStateChange((_authenticated, id) => {
      if (!alive) return;
      receivedAuthEvent = true;
      setActor(id);
      setSessionReady(true);
      setSessionError(null);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  const query = useQuery({
    queryKey: ['me', actor],
    queryFn: () => userApi.me(),
    enabled: !!actor,
  });
  const profile = query.data;
  const role = useSessionMode(actor, !!profile?.driverProfile);
  const user = useMemo(
    () =>
      profile && actor
        ? {
            userId: profile.userId,
            email: profile.email,
            displayName:
              profile.fullName?.trim() ||
              profile.email?.split('@')[0] ||
              'Usuario',
            role,
            driverId: profile.driverProfile?.driverId ?? null,
            driverStatus: profile.driverProfile?.status ?? null,
            canPublishRides: profile.canPublishRides,
          }
        : null,
    [profile, role, actor],
  );
  const refetch = query.refetch;
  const reload = useCallback(async () => {
    if (actor) return refetch();
    try {
      const { data, error } = await sessionAdapter.getSession();
      if (error) throw error;
      setActor(data.session?.user.id);
      setSessionReady(true);
      setSessionError(null);
    } catch {
      setSessionError(
        'No pudimos recuperar tu sesión. Vuelve a iniciar sesión.',
      );
    }
  }, [actor, refetch]);
  return {
    user,
    loading: !sessionReady || query.isLoading,
    error: query.error instanceof Error ? query.error.message : sessionError,
    reload,
  };
}
