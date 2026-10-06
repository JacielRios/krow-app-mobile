import type { RuntimeCommand, RuntimeSnapshot } from './protocol';

/** Local projection only. Never use this object as evidence of server persistence. */
export function projectCommand(
  snapshot: RuntimeSnapshot,
  command: RuntimeCommand,
): RuntimeSnapshot {
  if (command.expectedVersion !== snapshot.version)
    throw new Error('La acción depende de otra versión del viaje');
  if (snapshot.role !== 'driver' || snapshot.state !== 'in_progress')
    throw new Error('Esta acción necesita conexión');
  const stops = snapshot.stops.map(stop => ({ ...stop }));
  const bookings = snapshot.bookings.map(booking => ({ ...booking }));
  const stop = stops.find(item => item.stopId === snapshot.nextStopId);
  if (!stop) throw new Error('No hay una parada pendiente');
  if (command.action === 'arrive') {
    if (
      command.stopId !== stop.stopId ||
      !['pending', 'approaching'].includes(stop.state)
    )
      throw new Error('La parada cambió');
    stop.state = 'arrived';
  } else if (command.action === 'depart') {
    if (
      command.stopId !== stop.stopId ||
      !['arrived', 'servicing'].includes(stop.state)
    )
      throw new Error('Confirma la llegada primero');
    if (
      bookings.some(
        b =>
          (b.pickupStopId === stop.stopId && b.status === 'confirmed') ||
          (b.dropoffStopId === stop.stopId && b.status === 'in_progress'),
      )
    )
      throw new Error('Hay pasajeros pendientes en esta parada');
    stop.state = 'departed';
  } else {
    const booking = bookings.find(b => b.bookingId === command.bookingId);
    if (!booking || !['arrived', 'servicing'].includes(stop.state))
      throw new Error('Confirma la llegada primero');
    if (
      command.action === 'board' &&
      booking.status === 'confirmed' &&
      booking.pickupStopId === stop.stopId
    )
      booking.status = 'in_progress';
    else if (
      command.action === 'no_show' &&
      command.reason?.trim() &&
      booking.status === 'confirmed' &&
      booking.pickupStopId === stop.stopId
    )
      booking.status = 'no_show';
    else if (
      command.action === 'dropoff' &&
      booking.status === 'in_progress' &&
      booking.dropoffStopId === stop.stopId
    )
      booking.status = 'completed';
    else throw new Error('Esta transición necesita revisión o conexión');
    stop.state = 'servicing';
  }
  for (const item of stops) {
    item.pickups = bookings
      .filter(b => b.pickupStopId === item.stopId && b.status === 'confirmed')
      .reduce((n, b) => n + b.seats, 0);
    item.dropoffs = bookings
      .filter(
        b =>
          b.dropoffStopId === item.stopId &&
          ['confirmed', 'in_progress'].includes(b.status),
      )
      .reduce((n, b) => n + b.seats, 0);
  }
  return {
    ...snapshot,
    version: snapshot.version + 1,
    stops,
    bookings,
    nextStopId:
      stops.find(s => !['departed', 'skipped'].includes(s.state))?.stopId ??
      null,
  };
}
