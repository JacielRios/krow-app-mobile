import { supabaseAuthClient } from './supabaseAuthClient';
import Config from 'react-native-config';

export const sessionAdapter = {
  signIn: (email: string, password: string) =>
    supabaseAuthClient.auth.signInWithPassword({ email, password }),
  signUp: (
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ) =>
    supabaseAuthClient.auth.signUp({
      email,
      password,
      options: { data: metadata },
    }),
  signOut: () => supabaseAuthClient.auth.signOut(),
  getSession: () => supabaseAuthClient.auth.getSession(),
  getUser: () => supabaseAuthClient.auth.getUser(),
  requestRecovery: (email: string) =>
    supabaseAuthClient.auth.resetPasswordForEmail(email, {
      redirectTo: Config.KROW_AUTH_REDIRECT_URL,
    }),
  resendConfirmation: (email: string) =>
    supabaseAuthClient.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: Config.KROW_AUTH_REDIRECT_URL },
    }),
  updatePassword: (password: string) =>
    supabaseAuthClient.auth.updateUser({ password }),
  acceptAuthLink: async (url: string) => {
    if (!Config.KROW_AUTH_REDIRECT_URL) return false;
    const parsed = new URL(url),
      expected = new URL(Config.KROW_AUTH_REDIRECT_URL);
    if (
      parsed.protocol !== 'https:' ||
      parsed.origin !== expected.origin ||
      parsed.pathname !== expected.pathname
    )
      return false;
    const code = parsed.searchParams.get('code');
    const tokenHash = parsed.searchParams.get('token_hash');
    if (code) {
      const { data, error } =
        await supabaseAuthClient.auth.exchangeCodeForSession(code);
      if (error) throw error;
      // The installed SDK emits SIGNED_IN for a manually exchanged PKCE code.
      // Recovery is identified by its stored verifier, not an untrusted URL flag.
      return 'redirectType' in data && data.redirectType === 'PASSWORD_RECOVERY'
        ? 'recovery'
        : 'authenticated';
    }
    const type = parsed.searchParams.get('type');
    if (tokenHash && (type === 'recovery' || type === 'signup')) {
      const { error } = await supabaseAuthClient.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
      return type === 'recovery' ? 'recovery' : 'authenticated';
    }
    return false;
  },
  onAuthStateChange: (
    callback: (
      authenticated: boolean,
      actorId?: string,
      event?: string,
    ) => void,
  ) => {
    const {
      data: { subscription },
    } = supabaseAuthClient.auth.onAuthStateChange((event, session) =>
      callback(Boolean(session), session?.user.id, event),
    );
    return () => subscription.unsubscribe();
  },
};
