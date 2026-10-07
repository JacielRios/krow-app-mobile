import { readTrackingSnapshot } from '../src/features/pilot/trackingSnapshot';
import { readActiveRideView } from '../src/features/ride/api/activeRideView';

const stop = {
  stopId: 'stop',
  address: 'Parada',
  lat: 25.67,
  lng: -100.3,
  order: 1,
};
test('partial tracking messages have safe route and passenger lists', () => {
  const snapshot = readTrackingSnapshot(
    {
      rideId: 'ride',
      role: 'driver',
      stops: [stop, null, { ...stop, lat: NaN }],
      nextStop: stop,
    },
    'ride',
  );
  expect(snapshot.route.polyline).toBeNull();
  expect(snapshot.route.error).toContain('No pudimos cargar la ruta');
  expect(snapshot.position).toBeNull();
  expect(snapshot.stops).toHaveLength(1);
  expect(snapshot.nextStop?.pickups).toEqual([]);
  expect(snapshot.nextStop?.dropoffs).toEqual([]);
});
test.each([null, {}, { rideId: 'other', role: 'driver' }])(
  'invalid or other-trip socket messages are rejected',
  message => {
    expect(() => readTrackingSnapshot(message, 'ride')).toThrow('seguimiento');
  },
);
test.each([NaN, Infinity, 91])(
  'an invalid GPS fix removes live position and ETA (%s)',
  lat => {
    const snapshot = readTrackingSnapshot(
      {
        rideId: 'ride',
        role: 'driver',
        position: {
          lat,
          lng: -100.3,
          accuracy: 8,
          capturedAt: new Date().toISOString(),
        },
        etaSeconds: 120,
      },
      'ride',
    );
    expect(snapshot.position).toBeNull();
    expect(snapshot.etaSeconds).toBeNull();
    expect(snapshot.state).toBe('unavailable');
  },
);
test('malformed passengers cannot create unusable boarding actions', () => {
  const snapshot = readTrackingSnapshot(
    {
      rideId: 'ride',
      role: 'driver',
      nextStop: {
        ...stop,
        pickups: [null, {}, { bookingId: 'booking', name: 'Ana' }],
        dropoffs: null,
      },
    },
    'ride',
  );
  expect(snapshot.nextStop?.pickups).toEqual([
    { bookingId: 'booking', name: 'Ana' },
  ]);
  expect(snapshot.nextStop?.dropoffs).toEqual([]);
});
test.each([
  null,
  { role: 'conductor', ride: null },
  {
    role: 'conductor',
    ride: { rideId: 'ride', status: 'in_progress' },
    passengers: [null],
  },
  {
    role: 'pasajero',
    ride: { rideId: 'ride', status: 'in_progress' },
    myBooking: null,
  },
])('incomplete active views return a recoverable error', value => {
  expect(() => readActiveRideView(value)).toThrow('datos completos');
});
