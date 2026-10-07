export const money = (cents: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
export const rideDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export const statusText = (status: string) =>
  ({
    scheduled: 'Programado',
    full: 'Sin asientos',
    pending: 'Por confirmar',
    confirmed: 'Confirmado',
    in_progress: 'En curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
    rejected: 'No aceptado',
    no_show: 'No se presentó',
    interrupted: 'Interrumpido',
  }[status] ?? status);
