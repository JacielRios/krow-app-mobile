import {secureSessionStorage} from './secureSessionStorage';
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

const supabaseUrl = Config.SUPABASE_URL?.trim();
const supabaseAnonKey = Config.SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase Auth env vars. Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env and rebuild the app.',
  );
}

/**
 * Único cliente Supabase permitido en la app móvil.
 * Se usa exclusivamente para Auth y persistencia de la sesión. Los datos de
 * negocio se obtienen mediante KROW API.
 */
export const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
