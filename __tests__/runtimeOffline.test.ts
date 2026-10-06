import { projectCommand } from '../src/features/ride-runtime/offlineProjection';
import type {
  RuntimeCommand,
  RuntimeSnapshot,
} from '../src/features/ride-runtime/protocol';

const initial: RuntimeSnapshot = {
  rideId: 'ride',
  version: 10,
  role: 'driver',
  state: 'in_progress',
  route: null,
  routeVersion: 1,
  committedPolyline: null,
  committedProvider: null,
  position: null,
  tracking: 'unavailable',
  generatedAt: new Date().toISOString(),
  nextStopId: 'a',
  remainingMeters: null,
  etaSeconds: null,
  etaConfidence: 'low',
  stops: [
    {
      stopId: 'a',
      order: 1,
      address: 'A',
      lat: 19,
      lng: -99,
      state: 'pending',
      pickups: 1,
      dropoffs: 0,
    },
    {
      stopId: 'b',
      order: 2,
      address: 'B',
      lat: 19.1,
      lng: -99,
      state: 'pending',
      pickups: 0,
      dropoffs: 1,
    },
  ],
  bookings: [
    {
      bookingId: 'booking',
      pickupStopId: 'a',
      dropoffStopId: 'b',
      seats: 1,
      status: 'confirmed',
    },
  ],
};
const command = (
  snapshot: RuntimeSnapshot,
  action: RuntimeCommand['action'],
  options: Partial<RuntimeCommand> = {},
) =>
  projectCommand(snapshot, {
    commandId: 'command',
    expectedVersion: snapshot.version,
    action,
    ...options,
  });

it('recovers an ordered offline arrival, boarding, departure and dropoff without mutating the confirmed snapshot', () => {
  let state = command(initial, 'arrive', { stopId: 'a' });
  expect(() => command(state, 'depart', { stopId: 'a' })).toThrow(
    'pasajeros pendientes',
  );
  state = command(state, 'board', { bookingId: 'booking' });
  state = command(state, 'depart', { stopId: 'a' });
  expect(state.nextStopId).toBe('b');
  state = command(state, 'arrive', { stopId: 'b' });
  state = command(state, 'dropoff', { bookingId: 'booking' });
  expect(state.version).toBe(15);
  expect(state.bookings[0].status).toBe('completed');
  expect(initial.bookings[0].status).toBe('confirmed');
  expect(initial.version).toBe(10);
});
it('does not rebase conflicts, skip stops or locally confirm a ride completion', () => {
  expect(() =>
    projectCommand(initial, {
      commandId: 'x',
      expectedVersion: 9,
      action: 'arrive',
      stopId: 'a',
    }),
  ).toThrow('versión');
  expect(() => command(initial, 'arrive', { stopId: 'b' })).toThrow(
    'parada cambió',
  );
  expect(() => command(initial, 'complete')).toThrow();
});
