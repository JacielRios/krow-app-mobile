import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { DriverVehicle } from '../types/ride.types';

interface UseDriverVehiclesResult {
  vehicles: DriverVehicle[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDriverVehicles(): UseDriverVehiclesResult {
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchVehicles = useCallback(async () => {
    let active = true;
    setLoading(true);
    setError(null);

    try {
      // 1) Obtener el usuario autenticado actualmente
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (active) setError('No hay sesión activa');
        return;
      }

      // 2) Obtener el driver_id de ese usuario desde driver_profiles
      const { data: driverRow, error: driverError } = await supabase
        .from('driver_profiles')
        .select('driver_id')
        .eq('user_id', user.id)
        .single();

      if (driverError || !driverRow) {
        if (active) setError('No se encontró el perfil de conductor');
        return;
      }

      // 3) Obtener los vehículos activos de ese conductor
      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('vehicle_id, brand, model, car_year, license_plate')
        .eq('driver_id', driverRow.driver_id)
        .eq('is_active', true);

      if (vehiclesError) {
        if (active) setError(vehiclesError.message);
        return;
      }

      if (active) setVehicles((data as DriverVehicle[]) ?? []);
    } finally {
      if (active) setLoading(false);
      // `active` se usa para evitar setear estado en un componente desmontado
    }

    return () => {
      active = false;
    };
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    reload: () => setTick(t => t + 1),
  };
}
