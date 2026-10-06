# Pulido de interacción — 6 de octubre de 2026

## Cambios

- Selector de lugar con pestañas Mapa / Buscar lugar, confirmación fija y lista desplazable con el teclado abierto. Las sugerencias permanecen seleccionables al perder foco.
- Búsqueda, detalles y geocodificación cancelables; las respuestas antiguas no sustituyen la selección actual. Reintentos visibles y validación de respuestas antes de enviarlas al mapa nativo.
- Transiciones del modal y respuesta de los botones mediante las animaciones nativas de React Native; se cancelan al desmontar. Se respeta movimiento reducido.
- Deslizador de aportación con controles incrementales, accesos rápidos y gestos horizontales que permiten ceder el desplazamiento vertical. Dial y opciones de asientos respetan la capacidad del vehículo.
- Horarios rápidos con selección visible; las opciones anteriores a la fecha mínima se deshabilitan. Acciones de avance fijas y retorno al inicio al cambiar de paso.
- Colores de búsqueda y horario adaptados al tema; se mantienen la paleta, las sombras apiladas y las superficies translúcidas.
- Mapas con estados de carga, reintento y centrado. Se recrea el mapa nativo al sustituir la ruta provisional para evitar conservar el trazo anterior; la ruta calculada usa una línea continua por las calles.
- Los errores del cálculo de ruta se muestran para el destino actual; las respuestas anteriores se invalidan al cambiar los puntos o desmontar la pantalla.

## Validación local

- Jest: 14 suites, 49 pruebas aprobadas. Incluye cancelación, respuestas fuera de orden, foco/teclado, reintentos, respuestas inválidas, límites del deslizador, capacidad de asientos, recuperación del mapa y errores de rutas.
- TypeScript sin errores y ESLint sin errores en los archivos revisados.
- Bundle Android de producción generado correctamente con Metro (`--dev false`). Esto no equivale a un APK release firmado.
- Pixel 6 / API 34: búsqueda real de Monterrey, selección y confirmación; ruta calculada por la API; navegación a detalles; selección de vehículo; ajuste del precio arrastrando el deslizador; controles de asientos visibles y funcionales. No se publicó un viaje.
- Verificación adicional del 6 de octubre: arranque limpio con sesión de conductor, calles y marcadores visibles, recuperación mediante Reintentar mapa, recorrido de 5.9 km / 14 min por Av. Pablo Livas y actualización a 4.3 km / 12 min por Av. Eloy Cavazos sin conservar el trazado anterior.
- No apareció el fallo `Unable to find viewState` ni una excepción fatal en los registros revisados tras estas interacciones.

## Pendientes externos

- El APK debug instalado ya carga el mapa: usa la clave nativa dedicada cuando está configurada y admite la clave local existente como compatibilidad exclusiva de debug. No se incluyen claves en el repositorio.
- La compilación release exige `KROW_ANDROID_MAPS_API_KEY` (entorno o `android/local.properties` ignorado), sin recurrir a la clave de debug. Se comprobó el rechazo sin clave y la dependencia de la validación antes de `preReleaseBuild`. Queda configurar y validar una clave Android restringida al paquete y certificado de firma en un APK firmado.
- No se ha realizado una prueba de dispositivo iOS ni una certificación completa de producción.
