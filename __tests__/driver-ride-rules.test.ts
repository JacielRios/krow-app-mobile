import {
  CAMPUS_ORIGIN,
  maxOfferableSeats,
  selectedCompatibleStops,
} from '../src/features/ride/domain/driverRideRules';
import type { TransportStop } from '../src/features/maps/api/mapsApi';

const stop = (stopId: string, routeFraction: number): TransportStop => ({
  stopId,
  externalId: stopId,
  name: stopId,
  address: null,
  municipality: null,
  location: { lat: 25.66, lng: -100.24 },
  distanceFromRouteMeters: 100,
  routeFraction,
});

test('el origen predeterminado es el Instituto Tecnológico de Nuevo León', () => {
  expect(CAMPUS_ORIGIN.placeId).toBe('ChIJMx1I0TjAYoYR8sbHueA7sbM');
  expect(CAMPUS_ORIGIN.location).toEqual({
    lat: 25.664011,
    lng: -100.243225,
  });
});

test('el cupo ofertable descuenta siempre al conductor', () => {
  expect(maxOfferableSeats(4)).toBe(3);
  expect(maxOfferableSeats(2)).toBe(1);
  expect(maxOfferableSeats(1)).toBe(0);
});

test('solo publica paradas compatibles y ordenadas por avance', () => {
  const compatible = [stop('b', 0.8), stop('a', 0.2), stop('c', 0.5)];
  expect(
    selectedCompatibleStops(compatible, ['b', 'missing', 'a']).map(
      item => item.stopId,
    ),
  ).toEqual(['a', 'b']);
});
