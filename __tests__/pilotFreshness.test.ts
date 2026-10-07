import {
  latestTrackingPosition,
  positionFreshness,
} from '../src/features/pilot/useTracking';
import type { TrackingSnapshot } from '../src/features/pilot/pilotApi';
import { money } from '../src/shared/format';
describe('pilot display boundaries', () => {
  const now = Date.parse('2026-10-06T18:00:00Z');
  it('does not present old positions as live', () => {
    expect(
      positionFreshness(new Date(now - 10000).toISOString(), now).state,
    ).toBe('live');
    expect(
      positionFreshness(new Date(now - 11000).toISOString(), now).state,
    ).toBe('delayed');
    expect(
      positionFreshness(new Date(now - 31000).toISOString(), now).state,
    ).toBe('stale');
    expect(positionFreshness(undefined, now).state).toBe('unavailable');
    expect(positionFreshness('bad', now).state).toBe('unavailable');
  });
  it('preserves committed cents', () => {
    expect(money(1234)).toContain('12.34');
    expect(money(1200)).toContain('12.00');
  });
  it('a slow response cannot rewind the vehicle but still updates newly confirmed stops', () => {
    const current: TrackingSnapshot = {
      rideId: 'ride',
      role: 'driver',
      position: {
        seq: 2,
        capturedAt: '2026-10-06T18:00:00Z',
        lat: 25.7,
        lng: -100.3,
        accuracy: 10,
      },
      state: 'live',
      ageSeconds: 0,
      route: {
        polyline: 'route',
        durationSeconds: 120,
        version: '1',
        error: null,
      },
      stops: [],
      nextStop: null,
      myStop: null,
      myPickup: null,
      nextAction: null,
      etaSeconds: 120,
      canComplete: false,
    };
    const incoming: TrackingSnapshot = {
      ...current,
      position: {
        ...current.position!,
        seq: 1,
        capturedAt: '2026-10-06T17:59:55Z',
        lat: 25.6,
      },
      canComplete: true,
    };
    const merged = latestTrackingPosition(current, incoming);
    expect(merged.position).toEqual(current.position);
    expect(merged.canComplete).toBe(true);
    expect(merged.etaSeconds).toBeNull();
    expect(
      latestTrackingPosition(merged, { ...incoming, position: null }).position,
    ).toBeNull();
  });
  it('an earlier REST observation cannot restore a pickup after boarding changed the next stop', () => {
    const nextStop = {
      stopId: 'dropoff-stop',
      order: 2,
      lat: 25.7,
      lng: -100.3,
      address: 'Biblioteca',
      pickups: [],
      dropoffs: [{ bookingId: 'booking', name: 'Ana' }],
    };
    const current: TrackingSnapshot = {
      rideId: 'ride',
      observedAt: '2026-10-06T18:00:02Z',
      role: 'driver',
      position: null,
      state: 'unavailable',
      ageSeconds: null,
      route: {
        polyline: 'route-after-board',
        durationSeconds: 120,
        version: 'after-board',
        error: null,
      },
      stops: [nextStop],
      nextStop,
      myStop: null,
      myPickup: null,
      nextAction: null,
      etaSeconds: null,
      canComplete: false,
    };
    const oldStop = {
      ...nextStop,
      stopId: 'pickup-stop',
      order: 1,
      address: 'Encuentro',
      pickups: [{ bookingId: 'booking', name: 'Ana' }],
      dropoffs: [],
    };
    const delayed: TrackingSnapshot = {
      ...current,
      observedAt: '2026-10-06T18:00:01Z',
      route: {
        ...current.route,
        polyline: 'route-before-board',
        version: 'before-board',
      },
      stops: [oldStop, nextStop],
      nextStop: oldStop,
      canComplete: true,
    };
    const merged = latestTrackingPosition(current, delayed);
    expect(merged.nextStop?.stopId).toBe('dropoff-stop');
    expect(merged.route.version).toBe('after-board');
    expect(merged.canComplete).toBe(false);
    expect(merged.observedAt).toBe(current.observedAt);
    expect(
      latestTrackingPosition(current, {
        ...delayed,
        observedAt: '2026-10-06T18:00:03Z',
      }).nextStop,
    ).toEqual(oldStop);
  });
});
