import type { BookingStatus } from '../types/booking.types';
import type { RideStatus } from '../types/ride.types';

export type Role = 'pasajero' | 'conductor';

export interface StatusCopy {
  /** Etiqueta corta para badge / título. */
  label: string;
  /** Mensaje contextual largo (1-2 líneas) según rol. */
  message: string;
  /** Si la UI debe representar un estado terminal (sin acciones). */
  terminal: boolean;
}

const RIDE_COPY: Record<RideStatus, Record<Role, StatusCopy>> = {
  scheduled: {
    pasajero: {
      label: 'Programado',
      message:
        'El viaje está programado. El conductor puede confirmarte en breve.',
      terminal: false,
    },
    conductor: {
      label: 'Programado',
      message:
        'El viaje está programado. Revisa solicitudes y confirma pasajeros.',
      terminal: false,
    },
  },
  open: {
    pasajero: {
      label: 'Abierto',
      message:
        'El viaje está abierto a más solicitudes. El conductor puede confirmarte en breve.',
      terminal: false,
    },
    conductor: {
      label: 'Abierto',
      message:
        'Hay cupos disponibles. Revisa solicitudes nuevas y confirma a los pasajeros.',
      terminal: false,
    },
  },
  full: {
    pasajero: {
      label: 'Cupos llenos',
      message:
        'Este viaje ya no tiene lugares disponibles. Tu reserva debe estar confirmada o en lista de espera según aplique.',
      terminal: false,
    },
    conductor: {
      label: 'Cupos llenos',
      message:
        'Todos los asientos están asignados. Puedes iniciar el viaje cuando estés listo.',
      terminal: false,
    },
  },
  in_progress: {
    pasajero: {
      label: 'En curso',
      message: 'El viaje está en curso. Sigue al conductor en tiempo real.',
      terminal: false,
    },
    conductor: {
      label: 'En curso',
      message: 'Estás manejando. Tu ubicación se comparte con los pasajeros.',
      terminal: false,
    },
  },
  completed: {
    pasajero: {
      label: 'Completado',
      message: 'Llegaste a tu destino. ¡Gracias por viajar con Krow!',
      terminal: true,
    },
    conductor: {
      label: 'Completado',
      message: 'Viaje finalizado. Gracias por compartir tu ruta.',
      terminal: true,
    },
  },
  cancelled: {
    pasajero: {
      label: 'Cancelado',
      message: 'El viaje fue cancelado por el conductor.',
      terminal: true,
    },
    conductor: {
      label: 'Cancelado',
      message: 'Cancelaste este viaje. Los pasajeros han sido notificados.',
      terminal: true,
    },
  },
};

const BOOKING_COPY: Record<BookingStatus, Record<Role, StatusCopy>> = {
  pending: {
    pasajero: {
      label: 'Pendiente',
      message: 'Esperando que el conductor confirme tu solicitud.',
      terminal: false,
    },
    conductor: {
      label: 'Pendiente',
      message: 'Solicitud nueva: acepta o rechaza al pasajero.',
      terminal: false,
    },
  },
  confirmed: {
    pasajero: {
      label: 'Confirmada',
      message: 'El conductor confirmó tu lugar. ¡Prepárate para tu viaje!',
      terminal: false,
    },
    conductor: {
      label: 'Confirmada',
      message: 'Confirmaste a este pasajero. Está esperando el inicio del viaje.',
      terminal: false,
    },
  },
  rejected: {
    pasajero: {
      label: 'Rechazada',
      message: 'El conductor rechazó tu solicitud para este viaje.',
      terminal: true,
    },
    conductor: {
      label: 'Rechazada',
      message: 'Rechazaste esta solicitud.',
      terminal: true,
    },
  },
  in_progress: {
    pasajero: {
      label: 'En curso',
      message: 'Estás en camino. Disfruta tu viaje.',
      terminal: false,
    },
    conductor: {
      label: 'En curso',
      message: 'Este pasajero está a bordo.',
      terminal: false,
    },
  },
  completed: {
    pasajero: {
      label: 'Completada',
      message: 'Llegaste a tu destino. ¡Gracias por viajar con Krow!',
      terminal: true,
    },
    conductor: {
      label: 'Completada',
      message: 'Este pasajero llegó a su destino.',
      terminal: true,
    },
  },
  cancelled: {
    pasajero: {
      label: 'Cancelada',
      message: 'Esta reserva fue cancelada.',
      terminal: true,
    },
    conductor: {
      label: 'Cancelada',
      message: 'Esta reserva fue cancelada.',
      terminal: true,
    },
  },
};

export const getRideStatusCopy = (
  status: RideStatus,
  role: Role,
): StatusCopy => RIDE_COPY[status][role];

export const getBookingStatusCopy = (
  status: BookingStatus,
  role: Role,
): StatusCopy => BOOKING_COPY[status][role];
