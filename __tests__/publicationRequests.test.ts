import * as Keychain from 'react-native-keychain';
import { publicationRequestId } from '../src/features/ride/api/publicationRequests';
import { newCommandId } from '../src/features/ride-runtime/runtimeApi';
import type { PublishRidePayload } from '../src/features/ride/types';

jest.mock('../src/features/ride-runtime/runtimeApi', () => ({
  newCommandId: jest.fn(),
}));
const saved = new Map<string, string>();
const payload: PublishRidePayload = {
  vehicle_id: 'vehicle',
  corridor_id: 'avenue',
  origin_lat: 25.66,
  origin_lng: -100.24,
  destination_lat: 25.67,
  destination_lng: -100.2,
  destination_address: 'Centro',
  transport_stop_ids: ['stop'],
  departure_time: '2026-10-21T18:00:00.000Z',
  available_seats: 2,
  price_per_seat: 12.34,
};
beforeEach(() => {
  jest.clearAllMocks();
  saved.clear();
  let id = 0;
  jest
    .mocked(newCommandId)
    .mockImplementation(
      () => `11111111-1111-4111-8111-${String(++id).padStart(12, '0')}`,
    );
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async options => {
    const password = saved.get(options?.service ?? '');
    return password
      ? {
          username: 'publication',
          password,
          service: options!.service!,
          storage: 'Keystore' as Keychain.STORAGE_TYPE,
        }
      : false;
  });
  jest
    .mocked(Keychain.setGenericPassword)
    .mockImplementation(async (_user, password, options) => {
      saved.set(options?.service ?? '', password);
      return {
        service: options?.service ?? '',
        storage: 'Keystore' as Keychain.STORAGE_TYPE,
      };
    });
});

test('reuses the stored request after module/process state is lost', async () => {
  const first = await publicationRequestId('actor', payload);
  let restored!: typeof publicationRequestId;
  jest.isolateModules(() => {
    restored =
      require('../src/features/ride/api/publicationRequests').publicationRequestId;
  });
  expect(await restored('actor', { ...payload })).toBe(first);
  expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
});

test('serializes concurrent attempts and isolates users and changed trip details', async () => {
  const attempts = await Promise.all(
    [0, 1, 2].map(() => publicationRequestId('actor', payload)),
  );
  expect(new Set(attempts).size).toBe(1);
  expect(await publicationRequestId('another-actor', payload)).not.toBe(
    attempts[0],
  );
  expect(
    await publicationRequestId('actor', { ...payload, available_seats: 3 }),
  ).not.toBe(attempts[0]);
  expect(saved.size).toBe(2);
});

test('does not replace an unreadable receipt or fall back to unprotected storage', async () => {
  saved.set(
    'krow.ride.publication.actor',
    '{"identity":"trip","requestId":"invalid"}',
  );
  await expect(publicationRequestId('actor', payload)).rejects.toThrow(
    'recuperar',
  );
  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});

test('rejects a secure storage failure before returning a new request ID', async () => {
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  await expect(publicationRequestId('actor', payload)).rejects.toThrow(
    'forma segura',
  );
});
