# Revisión del cierre al abrir «Ver ruta» — 7 de octubre de 2026

Se revisaron la entrada al viaje activo, el mapa compartido, las respuestas REST/Socket y el servicio Android de ubicación. El fallo reportado ocurre al abrir la ruta, antes de observar movimiento. No se dispuso de un teléfono conectado ni de un registro del cierre; por eso las siguientes son causas posibles verificadas en código, no una reproducción física del incidente.

## Riesgos corregidos

- El mapa ejecutaba `fitToCoordinates` después de `onMapReady`, sin esperar dimensiones y carga. La implementación Android instalada usa `CameraUpdateFactory.newLatLngBounds(bounds, padding)`. Google documenta que estar disponible no basta: ejecutar esta actualización antes del layout lanza `IllegalStateException`. Ahora se esperan layout, mapa listo y carga, y se reserva área visible al aplicar padding. [Referencia oficial](https://developers.google.com/android/reference/com/google/android/gms/maps/CameraUpdateFactory).
- Origen, destino, paradas y vehículo llegaban al mapa sin validar. Ahora se descartan coordenadas nulas, no finitas o fuera de rango y se normaliza el rumbo; la decodificación de rutas mantiene su control de errores.
- Mientras se esperaba GPS, cada actualización podía encuadrar el mismo recorrido. Se evita repetir comandos si la geometría y el área visible no cambiaron. El marcador usa su coordenada declarativa en lugar de combinarla con una animación nativa concurrente.
- Seguimiento asumía que toda instantánea tenía ruta y listas completas de subidas/bajadas. REST y Socket comparten una validación de entrada; los datos parciales se adaptan de forma segura y los mensajes incorrectos se recuperan mediante REST.
- La vista activa valida los datos esenciales antes de leerlos. La navegación sin identificador de viaje muestra una salida segura; una excepción de render muestra reintento y retorno a los viajes. El error boundary protege errores JavaScript; la prevención en las entradas al mapa protege las condiciones nativas identificadas, sin prometer capturar cualquier fallo del SDK.
- El callback Android construía `JSONObject` fuera del bloque protegido. Android rechaza `NaN`/infinito y la excepción podía escapar del hilo principal. Ahora se valida el fix, la precisión y su antigüedad, se omiten velocidad/rumbo no finitos y todo el procesamiento queda dentro del bloque protegido.
- Android vuelve a comprobar permiso y sesión antes de iniciar el servicio. Salir de la pantalla cancela un inicio pendiente; un servicio ya activo continúa durante el viaje, incluso con la pantalla bloqueada. Timers y listeners Socket se retiran al dejar de observar el viaje. Los errores de retirada de GPS al destruir el servicio se controlan.
- La creación de sesiones se serializa: salir y reabrir mientras una solicitud sigue en vuelo no permite que la solicitud anterior sustituya una sesión nueva. Cada intento comprueba su generación y cuenta antes de enviar la solicitud; el cierre pendiente conserva únicamente la credencial de su propia sesión.

## Validación

- 54 pruebas aprobaron en seis suites: mapa, normalización de seguimiento, flujo piloto, sesiones nativas, antigüedad GPS y navegación recuperable. Incluyen regreso/reapertura con solicitud pendiente y sucesión entre cuentas y viajes diferentes.
- TypeScript y lint de archivos afectados se verificaron; lint conserva advertencias de estilos inline/`void`, sin errores.
- `:app:compileTrialKotlin` aprobó en 3 min 21 s; el resultado se registra en `node_modules/.cache/android-toolchain/driver-crash-kotlin-check.log` (235 tareas; 6 ejecutadas).
- La entrega final incluye el APK `0.2.1-trial` (código 3), con firma y bundle verificados en `docs/android-apk-20261007.json`. No se modificaron claves ni credenciales durante la corrección.

## Verificación física pendiente

Con la nueva compilación, abrir «Ver ruta» repetidamente desde un viaje del conductor; repetir con permiso denegado/revocado, GPS apagado, red interrumpida, salida inmediata de la pantalla y regreso. Comprobar que el viaje y las acciones de pasajeros siguen disponibles cuando falla el mapa/GPS. Bloquear la pantalla durante un viaje activo y confirmar continuidad del servicio. Si persiste el cierre, guardar `adb logcat -b crash -d` inmediatamente después para identificar la excepción exacta y el dispositivo/versión Android.
