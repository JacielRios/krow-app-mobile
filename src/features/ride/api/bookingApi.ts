import {
  apiRequest,
  ApiError,
  versionedApiRequest,
} from '../../../core/api/apiClient';
import Config from 'react-native-config';
import { newCommandId } from '../../ride-runtime/runtimeApi';
import type { BookingMutableStatus } from '../types/booking.types';

export const bookingApi = {
  activeRideIds: () =>
    apiRequest<Array<{ ride_id: string; status: 'pending' | 'confirmed' }>>(
      '/bookings/mine/active',
    ),
  pendingCount: () => apiRequest<{ count: number }>('/bookings/pending-count'),
  request: async (
    rideId: string,
    pickupStopId: string,
    dropoffStopId: string,
    seats = 1,
  ) => {
    if (Config.KROW_RUNTIME_ENABLED === 'true') {
      try {
        return await versionedApiRequest<{ bookingId: string }>(
          'v2',
          `/rides/${rideId}/bookings`,
          {
            method: 'POST',
            body: JSON.stringify({
              commandId: newCommandId(),
              seats,
              pickupStopId,
              dropoffStopId,
            }),
          },
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
      }
    }
    return apiRequest<{ bookingId: string }>(`/rides/${rideId}/bookings`, {
      method: 'POST',
      body: JSON.stringify({ seats, pickupStopId, dropoffStopId }),
    });
  },
  updateStatus: (bookingId: string, status: BookingMutableStatus) => {
    const action =
      status === 'confirmed'
        ? 'accept'
        : status === 'rejected'
        ? 'reject'
        : 'cancel';
    return apiRequest<{ success: boolean }>(
      `/bookings/${bookingId}/${action}`,
      { method: 'POST' },
    );
  },
};
