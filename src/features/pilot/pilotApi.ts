import { apiRequest } from '../../core/api/apiClient';
export interface LocationSample {
  seq: number;
  capturedAt: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}
export interface OperationalStop {
  stopId: string;
  order: number;
  lat: number;
  lng: number;
  address: string;
  pickups: Array<{ bookingId: string; name: string }>;
  dropoffs: Array<{ bookingId: string; name: string }>;
}
export interface TrackingSnapshot {
  rideId: string;
  observedAt?: string;
  role: 'driver' | 'passenger';
  position: LocationSample | null;
  state: 'live' | 'delayed' | 'stale' | 'unavailable';
  ageSeconds: number | null;
  route: {
    polyline: string | null;
    durationSeconds: number;
    version: string;
    error: string | null;
  };
  stops: OperationalStop[];
  nextStop: OperationalStop | null;
  myStop: { lat: number; lng: number; address: string } | null;
  etaSeconds: number | null;
  myPickup: { lat: number; lng: number; address: string } | null;
  nextAction: 'pickup' | 'dropoff' | null;
  canComplete: boolean;
}
export interface ActivityItem {
  rideId: string;
  status: string;
  departureTime: string;
  originAddress: string;
  destinationAddress: string;
  bookingId: string | null;
  bookingStatus: string | null;
  amountCents: number | null;
  pricePerSeatCents: number;
}
export interface Message {
  messageId: string;
  senderId: string;
  clientId: string;
  body: string;
  createdAt: string;
}
export interface History {
  role: 'driver' | 'passenger';
  ride: {
    ride_id: string;
    status: string;
    departure_time: string;
    origin_address: string;
    destination_address: string;
    driver_name: string | null;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    license_plate: string | null;
  };
  bookings: Array<{
    bookingId: string;
    status: string;
    name: string;
    amountCents: number;
    cashStatus: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupOrder: number;
    dropoffOrder: number;
    myReview: number | null;
  }>;
}
// History is chronological and may include earlier, cancelled reservations.
export function currentPassengerBooking(bookings: History['bookings']) {
  return (
    bookings.find(b =>
      ['pending', 'confirmed', 'in_progress'].includes(b.status),
    ) ?? bookings[bookings.length - 1]
  );
}
const post = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
export const pilotApi = {
  requestClosure: () =>
    post<{ status: 'access_closed'; dataProcessing: 'pending_policy' }>(
      '/me/closure',
    ),
  activity: (context: 'driver' | 'passenger', group: string, offset = 0) =>
    apiRequest<ActivityItem[]>(
      `/activity?context=${context}&group=${group}&offset=${offset}&limit=30`,
    ),
  tracking: (rideId: string) =>
    apiRequest<TrackingSnapshot>(`/rides/${rideId}/tracking`),
  session: (rideId: string, deviceId: string) =>
    post<{ sessionId: string; uploadToken: string; expiresAt: string }>(
      `/rides/${rideId}/tracking/sessions`,
      { deviceId },
    ),
  close: (rideId: string) =>
    apiRequest(`/rides/${rideId}/tracking/sessions`, { method: 'DELETE' }),
  attend: (
    rideId: string,
    bookingId: string,
    action: 'board' | 'dropoff' | 'no-show',
  ) => post(`/rides/${rideId}/stops/${bookingId}/attend`, { action }),
  messages: (bookingId: string, cursor?: string) =>
    apiRequest<{
      messages: Message[];
      canWrite: boolean;
      nextCursor: string | null;
    }>(
      `/bookings/${bookingId}/messages${
        cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      }`,
    ),
  send: (bookingId: string, clientId: string, body: string) =>
    post(`/bookings/${bookingId}/messages`, { clientId, body }),
  cash: (bookingId: string) =>
    apiRequest<{ amountCents: number; status: string }>(
      `/bookings/${bookingId}/cash`,
    ),
  collect: (bookingId: string) => post(`/bookings/${bookingId}/cash/collect`),
  review: (bookingId: string, stars: number, comment: string) =>
    post(`/bookings/${bookingId}/review`, { stars, comment }),
  history: (rideId: string) => apiRequest<History>(`/rides/${rideId}/history`),
};
