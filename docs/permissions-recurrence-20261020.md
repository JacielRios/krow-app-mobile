# Android 0.7.0: permiso inicial y continuación del plan

Al abrir KROW se solicita el permiso de notificaciones en Android 13 o superior. Se pide una vez automáticamente; rechazarlo no impide usar la aplicación. Si ya está concedido, no aparece otro diálogo. Tras iniciar sesión, el teléfono se registra automáticamente. Perfil mantiene **Activar notificaciones** y **Abrir ajustes de notificaciones** para recuperar una negativa. Android anterior a 13 no muestra ese diálogo del sistema.

## Viajes recurrentes

En **Publicar viaje**, selecciona fecha inicial/hora, activa **Repetir en varias fechas**, elige días y un periodo de una a cuatro semanas. Revisa todas las fechas y confirma el número de salidas. Se conserva la hora de Ciudad de México, el recorrido, vehículo, cupo y aportación; cada viaje se administra por separado.

Las salidas se publican una a una con conexión. Si falla la red, los viajes confirmados se conservan y puedes **Retomar publicaciones pendientes** al volver a Publicar viaje. El avance y los identificadores quedan protegidos por cuenta y API. No se vuelve a enviar una salida confirmada y un reintento usa el mismo identificador. No es una cola offline automática. Finalizar un intento conserva los viajes ya publicados; revisa Mis viajes si perdiste una respuesta.

## Invitaciones

En tu viaje futuro, **Invitar a este viaje** abre las opciones de compartir del teléfono. El pasajero abre el enlace, inicia sesión, elige subida y bajada y solicita un lugar. El conductor debe aprobarlo: compartir o abrir el enlace no confirma la reserva. Si el pasajero ya tiene una reserva activa, se abre su detalle después de revalidar el estado. Una cancelación permite solicitar nuevamente si el viaje sigue disponible. Un tercero no accede a pasajeros, chat o GPS por poseer el enlace.

## Recordatorios

La API prepara un recordatorio dentro de los 30 minutos previos a la salida para el conductor y pasajeros confirmados. Los avisos caducan al partir y se revalidan antes de enviar. Requieren permiso, registro y entrega FCM. No son alarmas exactas ni una garantía de recepción después de cierre forzado.

## Verificación pendiente

La compilación y pruebas automatizadas se documentan en la evidencia del APK y en `C:/Users/Novasys/Documents/krow-app-backend/docs/permissions-recurrence-20261020.md`. Falta validar diálogo y registro reales, push en cada estado de la app, compartir/aprobar entre participantes, recuperación del lote con modo avión, Keystore, teclado y recorrido GPS. iOS no está compilado ni probado.

El usuario indicó que agregará el callback a Redirect URLs de Supabase. La aceptación completa de recuperación/confirmación por correo sigue pendiente; una página HTTP disponible no acredita ese recorrido.
