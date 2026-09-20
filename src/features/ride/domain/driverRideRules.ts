import type { PlacesAutocompleteValue } from '../../maps';
import type { TransportStop } from '../../maps/api/mapsApi';

export const CAMPUS_ORIGIN: PlacesAutocompleteValue = {
  address: 'Av. Eloy Cavazos 2001, Tolteca, 67170 Guadalupe, N.L.',
  placeId: 'ChIJMx1I0TjAYoYR8sbHueA7sbM',
  location: { lat: 25.664011, lng: -100.243225 },
};

export const maxOfferableSeats = (totalCapacity: number): number =>
  Math.max(0, Math.floor(totalCapacity) - 1);

export function selectedCompatibleStops(
  compatibleStops: TransportStop[],
  selectedStopIds: string[],
): TransportStop[] {
  const selected = new Set(selectedStopIds);
  return compatibleStops
    .filter(stop => selected.has(stop.stopId))
    .sort((a, b) => a.routeFraction - b.routeFraction);
}
