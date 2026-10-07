import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
const options = (key: string) => ({
  service: 'krow.auth.' + key,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});
async function save(key: string, value: string) {
  const result = await Keychain.setGenericPassword(
    'session',
    value,
    options(key),
  );
  if (!result) throw new Error('No pudimos guardar la sesión de forma segura');
}
// Migrate existing installs once. A failed secure write must keep the old
// session recoverable; new credentials never fall back to plaintext storage.
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const saved = await Keychain.getGenericPassword(options(key));
    if (saved) return saved.password;
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      await save(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string) {
    await save(key, value);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    await Promise.all([
      Keychain.resetGenericPassword(options(key)),
      AsyncStorage.removeItem(key),
    ]);
  },
};
