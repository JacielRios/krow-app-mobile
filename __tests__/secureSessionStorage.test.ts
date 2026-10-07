import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { secureSessionStorage } from '../src/core/auth/secureSessionStorage';
describe('secure session upgrade', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue(false);
    jest
      .mocked(Keychain.setGenericPassword)
      .mockResolvedValue({ service: 'test', storage: 'test' } as never);
  });
  it('moves an existing session only after its secure write succeeds', async () => {
    await AsyncStorage.setItem('old', 'synthetic-token');
    expect(await secureSessionStorage.getItem('old')).toBe('synthetic-token');
    expect(await AsyncStorage.getItem('old')).toBeNull();
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'session',
      'synthetic-token',
      expect.objectContaining({ service: 'krow.auth.old' }),
    );
  });
  it('does not destroy the session when secure storage is unavailable', async () => {
    await AsyncStorage.setItem('old', 'synthetic-token');
    jest
      .mocked(Keychain.setGenericPassword)
      .mockRejectedValueOnce(new Error('unavailable'));
    await expect(secureSessionStorage.getItem('old')).rejects.toThrow(
      'unavailable',
    );
    expect(await AsyncStorage.getItem('old')).toBe('synthetic-token');
  });
  it('never saves a new token in plaintext and clears both stores at logout', async () => {
    await secureSessionStorage.setItem('new', 'synthetic-token');
    expect(await AsyncStorage.getItem('new')).toBeNull();
    await secureSessionStorage.removeItem('new');
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'krow.auth.new' }),
    );
  });
});
