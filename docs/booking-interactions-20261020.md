# Solicitudes y confirmaciones: Android 0.6.0

Etapa posterior: [Android 0.7.0, permiso al abrir y continuación del plan](permissions-recurrence-20261020.md). El registro de notificaciones ahora es automático tras login y permiso concedido; esta guía conserva la evidencia histórica de 0.6.0.

20 de octubre de 2026. APK privado `artifacts/android/krow-0.6.0-trial.apk`, código 11, firma de prueba existente. API desplegada y compatible. [Verificación del APK](android-apk-0.6.0-20261020.json).

## Uso

1. Abre Inicio → **Solicitudes y respuestas**. El conductor verá pendientes con pasajero, subida/bajada, horario, lugares y aportación. Aceptar/rechazar verifica el estado actual en servidor antes de actuar.
2. Una novedad muestra una hoja breve en Inicio/Viajes/viaje programado. **Revisar después** permite continuar; la bandeja conserva el estado. No se interrumpe la escritura en chat, formularios o seguimiento activo.
3. El pasajero ve una confirmación destacada con conductor/vehículo y ruta cuando el estado actual es confirmado. **Entendido** o abrir el detalle registra que la vio; no se repite al reabrir en esa instalación/cuenta. Si se pospone sin leerla, puede recuperarse en la próxima sesión.
4. Para push: Perfil → **Activar notificaciones**, conceder permiso Android 13+ y esperar confirmación del registro. La configuración está habilitada en el APK y backend; el usuario conserva el control del permiso. Sin permiso/push, la bandeja sigue consultando KROW.
5. Al tocar una notificación de reserva, el enlace incluye el booking exacto y espera el login si hace falta. Una solicitud cancelada, rechazada o vencida se consulta de nuevo; no se acepta a ciegas desde el aviso.

## Consistencia y límites

Consulta compartida cada tres segundos en primer plano, recuperación al reanudar e invalidación de listados/detalles. No es entrega instantánea garantizada. El servidor decide estado/cupo y rechaza conflictos; los botones bloquean doble pulsación. Una copia desactualizada por falta de red no permite responder. No existe una cola offline de aceptación/rechazo.

La bandeja recupera hasta 50 registros y respuestas del pasajero de la última semana, según outbox y estado vigente. El historial conserva el resto. Los reconocimientos guardan solo identificadores/fechas en Keychain/Keystore por API/cuenta, con retención de ocho días. No se sincronizan como leídos entre varios teléfonos; no se eliminan al salir para evitar repetir confirmaciones al volver a entrar.

Sin viaje activo, HTTP 204 se traduce en `null` normal; los fallos reales siguen mostrándose. El chat utiliza lista sin inversión, mensajes cronológicos, anteriores desde la cabecera y seguimiento del final solo cuando se está cerca; conserva reintento con el mismo identificador.

## Evidencia y aceptación pendiente

246 pruebas móviles en 39 suites aprobaron; regresión dirigida final de 9 pruebas aprobada tras los últimos ajustes. API: 195 pruebas con PostgreSQL aislado y 8 E2E HTTP; web: 56 pruebas. El proveedor FCM aceptó una petición de validación sin entrega. La API publicada aprobó 15 comprobaciones HTTP, incluida bandeja autorizada y 204 sin viaje activo. No se usaron notificaciones reales para simular una aceptación integral.

ADB no detectó dispositivos. Siguen pendientes: recepción de push con app abierta/segundo plano/proceso cerrado, apertura nativa, permisos denegados, cambio de cuenta, modo avión, orientación/scroll/teclado y accesibilidad en Android. El código compartido contempla iOS y ambos temas, pero no se compiló ni validó iOS. El cierre forzado por el usuario no garantiza recepción FCM.

El informe detallado y sus evidencias están en `docs/booking-interactions-20261020.md` del repositorio backend. El plan general aún requiere recurrencia, invitaciones, recordatorios, comprobación del redirect de Supabase Auth y aceptación de GPS/rendimiento con participantes reales.
