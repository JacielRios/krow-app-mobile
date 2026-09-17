import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../api/vehicleApi';
import type { DriverVehicle } from '../types';

interface UseDriverVehiclesResult {
  vehicles: DriverVehicle[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDriverVehicles(): UseDriverVehiclesResult {
  const query = useQuery({ queryKey: ['driver-vehicles'], queryFn: vehicleApi.list });

  return {
    vehicles: query.data ?? [],
    loading: query.isPending,
    error: query.error?.message ?? null,
    reload: () => { query.refetch().catch(() => undefined); },
  };
}
