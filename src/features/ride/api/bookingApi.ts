import { apiRequest } from '../../../core/api/apiClient';
import type { BookingMutableStatus } from '../types/booking.types';

export const bookingApi = {
  activeRideIds: () => apiRequest<Array<{ ride_id: string; status: 'pending' | 'confirmed' }>>('/bookings/mine/active'),
  pendingCount: () => apiRequest<{ count: number }>('/bookings/pending-count'),
  request: (rideId: string, seats = 1) => apiRequest<{ bookingId: string }>(`/rides/${rideId}/bookings`, { method: 'POST', body: JSON.stringify({ seats }) }),
  updateStatus: (bookingId: string, status: BookingMutableStatus) => {
    const action = status === 'confirmed' ? 'accept' : status === 'rejected' ? 'reject' : 'cancel';
    return apiRequest<{ success: boolean }>(`/bookings/${bookingId}/${action}`, { method: 'POST' });
  },
};
