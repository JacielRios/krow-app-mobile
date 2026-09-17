import { supabaseAuthClient } from './supabaseAuthClient';

export const sessionAdapter = {
  signIn: (email: string, password: string) => supabaseAuthClient.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string, metadata: Record<string, unknown>) =>
    supabaseAuthClient.auth.signUp({ email, password, options: { data: metadata } }),
  signOut: () => supabaseAuthClient.auth.signOut(),
  getSession: () => supabaseAuthClient.auth.getSession(),
  getUser: () => supabaseAuthClient.auth.getUser(),
  onAuthStateChange: (callback: (authenticated: boolean) => void) => {
    const { data: { subscription } } = supabaseAuthClient.auth.onAuthStateChange((_event, session) => callback(Boolean(session)));
    return () => subscription.unsubscribe();
  },
};
