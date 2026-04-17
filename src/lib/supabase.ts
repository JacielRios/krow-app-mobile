import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Config from 'react-native-config'

const supabaseUrl = Config.SUPABASE_URL?.trim()
const supabaseAnonKey = Config.SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env and rebuild the Android app.',
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
