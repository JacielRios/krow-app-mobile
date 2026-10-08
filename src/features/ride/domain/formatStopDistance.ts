/** Distancia en línea recta; no equivale a una ruta peatonal. */
export const formatStopDistance = (meters: number): string =>
  meters < 1000
    ? `${Math.round(meters)} m`
    : `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(
        meters / 1000,
      )} km`;
