import { apiRequest } from '../../../core/api/apiClient';

export interface CurrentUserResponse {
  userId: string;
  email: string | null;
  fullName: string | null;
  institutionalId?: string | null;
  academicProgram?: string | null;
  academicPeriod?: number | null;
  profilePhoto: string | null;
  rating: number | null;
  role: 'conductor' | 'pasajero';
  canPublishRides: boolean;
  driverProfile: {
    driverId: string;
    status: string | null;
    rating: number | null;
  } | null;
}

export const userApi = {
  me: () => apiRequest<CurrentUserResponse>('/me'),
  upsertProfile: (profile: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>('/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
};
