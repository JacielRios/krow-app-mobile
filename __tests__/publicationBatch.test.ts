import * as Keychain from 'react-native-keychain';
import { rideApi } from '../src/features/ride/api/rideApi';
import {
  publishRideBatch,
  readPublicationBatch,
} from '../src/features/ride/api/publicationBatch';
import type { PublishRidePayload } from '../src/features/ride/types';

jest.mock('../src/core/api/apiClient', () => ({
  apiBaseUrl: () => 'https://api.test',
}));
jest.mock('../src/features/ride/api/rideApi', () => ({
  rideApi: { create: jest.fn() },
}));
let mockId = 0;
jest.mock('../src/features/ride-runtime/runtimeApi', () => ({
  newCommandId: () =>
    `00000000-0000-4000-8000-${String(++mockId).padStart(12, '0')}`,
}));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device' },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));
const records = new Map<string, string>();
const payload: PublishRidePayload = {
  vehicle_id: 'vehicle',
  corridor_id: 'corridor',
  origin_lat: 25,
  origin_lng: -100,
  destination_lat: 26,
  destination_lng: -100,
  transport_stop_ids: ['stop'],
  departure_time: '2099-01-01T16:00:00.000Z',
  available_seats: 2,
  price_per_seat: 20,
};
const dates = [payload.departure_time, '2099-01-03T16:00:00.000Z'];
beforeEach(() => {
  jest.clearAllMocks();
  records.clear();
  mockId = 0;
  jest.mocked(Keychain.getGenericPassword).mockImplementation(async opts => {
    const password = records.get(opts?.service ?? '');
    return password
      ? {
          password,
          username: 'batch',
          service: opts?.service ?? '',
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        }
      : false;
  });
  jest
    .mocked(Keychain.setGenericPassword)
    .mockImplementation(async (_user, password, opts) => {
      records.set(opts?.service ?? '', password);
      return {
        service: opts?.service ?? '',
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      };
    });
  jest
    .mocked(rideApi.create)
    .mockImplementation(async (_data, publication) => ({
      rideId: publication!.requestId,
    }));
});
test('durably saves every request ID before sending and resumes only unfinished dates', async () => {
  jest
    .mocked(rideApi.create)
    .mockImplementationOnce(async (_data, request) => {
      expect([...records.values()][0]).toContain('000000000002');
      return { rideId: request!.requestId };
    })
    .mockRejectedValueOnce(new Error('Network lost'));
  const first = await publishRideBatch('driver', { payload, dates });
  expect(first.error).toBe('Network lost');
  expect(first.batch.entries.filter(e => e.rideId)).toHaveLength(1);
  const resumed = await publishRideBatch('driver');
  expect(resumed.error).toBeNull();
  expect(resumed.batch.entries.filter(e => e.rideId)).toHaveLength(2);
  expect(
    jest.mocked(rideApi.create).mock.calls.map(c => c[1]?.requestId),
  ).toEqual([
    first.batch.entries[0].requestId,
    first.batch.entries[1].requestId,
    first.batch.entries[1].requestId,
  ]);
});
test('a lost successful response retries with the same ID and a completed batch is not sent again', async () => {
  const creations = new Set<string>();
  let lost = true;
  jest.mocked(rideApi.create).mockImplementation(async (_data, request) => {
    creations.add(request!.requestId);
    if (lost) {
      lost = false;
      throw new Error('Response lost');
    }
    return { rideId: request!.requestId };
  });
  await publishRideBatch('driver', { payload, dates });
  await publishRideBatch('driver');
  const count = jest.mocked(rideApi.create).mock.calls.length;
  await publishRideBatch('driver', { payload, dates });
  expect(creations.size).toBe(2);
  expect(rideApi.create).toHaveBeenCalledTimes(count);
});
test('failed persistence prevents all requests and another account cannot recover this batch', async () => {
  jest.mocked(Keychain.setGenericPassword).mockResolvedValueOnce(false);
  await expect(publishRideBatch('driver', { payload, dates })).rejects.toThrow(
    'forma segura',
  );
  expect(rideApi.create).not.toHaveBeenCalled();
  await publishRideBatch('driver', { payload, dates });
  expect(await readPublicationBatch('other')).toBeNull();
});
test('an incomplete batch cannot silently be replaced by a changed form', async () => {
  jest.mocked(rideApi.create).mockRejectedValueOnce(new Error('Network lost'));
  await publishRideBatch('driver', { payload, dates });
  await expect(
    publishRideBatch('driver', {
      payload: { ...payload, price_per_seat: 30 },
      dates,
    }),
  ).rejects.toThrow('primero');
});
