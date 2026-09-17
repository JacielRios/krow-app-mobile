import { apiRequest } from '../../../core/api/apiClient';
import type { DriverVehicle } from '../types';

export const vehicleApi = {
  list: () => apiRequest<DriverVehicle[]>('/vehicles'),
};
