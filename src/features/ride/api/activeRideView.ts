import type { ActiveRideDataApiView } from './rideApi';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

/** Fail into the screen's retry state before dereferencing incomplete API data. */
export function readActiveRideView(value: unknown): ActiveRideDataApiView {
  const validRide =
    object(value) &&
    object(value.ride) &&
    typeof value.ride.rideId === 'string' &&
    !!value.ride.rideId &&
    typeof value.ride.status === 'string';
  const validDriver =
    validRide &&
    value.role === 'conductor' &&
    Array.isArray(value.passengers) &&
    value.passengers.every(
      passenger =>
        object(passenger) &&
        typeof passenger.bookingId === 'string' &&
        typeof passenger.bookingStatus === 'string',
    );
  const validPassenger =
    validRide &&
    value.role === 'pasajero' &&
    object(value.myBooking) &&
    typeof value.myBooking.status === 'string' &&
    typeof value.myBooking.bookingId === 'string' &&
    object(value.driver);
  if (!validDriver && !validPassenger)
    throw new Error(
      'No pudimos cargar los datos completos del viaje. Reintenta.',
    );
  return value as unknown as ActiveRideDataApiView;
}
