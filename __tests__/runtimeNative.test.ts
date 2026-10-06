jest.mock('react-native', () => ({
  NativeModules: {
    KrowNavigation: {
      prepare: jest.fn(),
      restore: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      updateStops: jest.fn(),
      configureTransport: jest.fn(),
      drainLocations: jest.fn(),
      acknowledgeLocations: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn(),
  Platform: { OS: 'ios' },
  PermissionsAndroid: {},
}));
jest.mock('../src/core/api/apiClient', () => ({
  apiBaseUrl: () => 'https://api.test',
}));
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: {
    getSession: async () => ({
      data: { session: { access_token: 'test', expires_at: 2000000000 } },
    }),
  },
}));
import { nativeNavigation } from '../src/features/ride-runtime/nativeNavigation';
import { NativeModules } from 'react-native';
const mockNative = NativeModules.KrowNavigation;
import type {
  LocationSample,
  RuntimeSnapshot,
} from '../src/features/ride-runtime/protocol';

const sample: LocationSample = {
  sessionId: 'session',
  sequence: 7,
  capturedAt: new Date().toISOString(),
  lat: 19,
  lng: -99,
  accuracyMeters: 5,
  speedMps: 10,
  headingDegrees: 0,
};
beforeEach(() => {
  jest.clearAllMocks();
  mockNative.drainLocations.mockResolvedValue([sample]);
});
it('retains encrypted coordinates when the network fails', async () => {
  await expect(
    nativeNavigation.flush('ride', async () => {
      throw new Error('offline');
    }),
  ).rejects.toThrow('offline');
  expect(mockNative.acknowledgeLocations).not.toHaveBeenCalled();
  expect(mockNative.drainLocations).toHaveBeenCalledWith('ride');
});
it.each([
  { accepted: 1, durable: false },
  { accepted: 0, durable: true },
  null,
])(
  'does not delete a batch without a complete durable receipt: %j',
  async receipt => {
    await expect(
      nativeNavigation.flush('ride', async () => receipt),
    ).rejects.toThrow('persistencia');
    expect(mockNative.acknowledgeLocations).not.toHaveBeenCalled();
  },
);
it('acknowledges exactly the final persisted sequence after successful replay', async () => {
  await nativeNavigation.flush('ride', async () => ({
    accepted: 1,
    durable: true,
  }));
  expect(mockNative.acknowledgeLocations).toHaveBeenCalledWith(7);
});
it('never updates driver navigation from a passenger snapshot', async () => {
  await nativeNavigation.updateStops({ role: 'passenger' } as RuntimeSnapshot);
  expect(mockNative.updateStops).not.toHaveBeenCalled();
});
it('scopes background delivery to the authorized ride and token expiration', async () => {
  await nativeNavigation.synchronizeTransport('ride');
  expect(mockNative.configureTransport).toHaveBeenCalledWith(
    'ride',
    'https://api.test/v2/rides/ride/locations',
    'test',
    2000000000000,
  );
});
