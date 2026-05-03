import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@krow/session_login_mode';

export type SessionLoginMode = 'pasajero' | 'conductor';

export async function setSessionLoginMode(mode: SessionLoginMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}

export async function getSessionLoginMode(): Promise<SessionLoginMode | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value === 'pasajero' || value === 'conductor') {
    return value;
  }
  return null;
}

export async function clearSessionLoginMode(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
