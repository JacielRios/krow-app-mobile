# Revisión del producto a partir del APK 0.4.0

## Diagnóstico de las nueve capturas

La entrega anterior redujo ruido decorativo, pero quitó agrupación sin sustituirla por una composición suficiente. Cambiar todas las tarjetas por contenido abierto no resolvió la jerarquía de los viajes. Las capturas reales muestran el resultado: direcciones largas con el mismo peso, estados poco informativos y acciones desconectadas de su contexto.

| Captura | Evidencia observable | Causa en el código | Decisión de producto |
| --- | --- | --- | --- |
| 1 · En curso | Tres datos y gran vacío; “0 reservas completadas” en un viaje activo; no hay acceso visible al seguimiento. | `HistoryScreen` se usa también para consultar cobros y reservas de un viaje activo, pero su composición solo cuenta reservas finalizadas. | Resumen operativo con estado, ruta en dos puntos, salida y vehículo. Distinguir activo, programado y cerrado; permitir volver al seguimiento sin ocultar los cobros. |
| 2 · Inicio | Saludo, dos títulos y dos explicaciones antes de actuar; coordenadas crudas en el historial. | Repetición de presentación en Home y uso directo de `originLabel`/`destinationLabel` sin distinguir coordenadas de direcciones. | Una cabecera breve, una acción de viaje, accesos compactos y recorridos legibles. Si solo hay coordenadas, decir que falta una dirección; no inventar una calle ni geocodificar cada fila. |
| 3 · Cancelado | Ruta completa en negrita, nombre suelto, dos direcciones como párrafos, estado azul y dinero sin etiqueta. | La reserva es una pila de textos; el tono “info” se usa para casi todos los estados. | Separar resumen del viaje, participante, recorrido de la reserva e importe/cobro. Cancelación neutra; importe con concepto y estado del cobro. |
| 4 · Publicación inicial | Tres círculos grandes, origen y campo de destino; el resto queda vacío. | El mapa solo aparece después de elegir destino y avenida. El indicador de pasos consume espacio sin aportar contexto espacial. | Progreso compacto, origen/destino en un mismo módulo y un mapa de referencia desde el primer paso. Conservar la validación de cada etapa. |
| 5 · Revisión | Paradas concatenadas, demasiadas líneas, marcas de confirmación superpuestas y datos importantes fuera del primer vistazo. | La revisión concatena nombres con `join(' · ')`; todos los marcadores de revisión están seleccionados. | Ruta resumida, horario/cupo/aportación en datos compactos y paradas numeradas con expansión. Marcadores numerados sin ampliación de selección. |
| 6 y 8 · Seguimiento | Tres controles grandes sobre el mapa; “Seguir vehículo” invade el área del logo; destino repetido; GPS y precisión ocupan la parte principal del panel. | Controles resueltos como botones de formulario; resumen y contenido repiten la próxima parada; acción final dentro del scroll. | Controles flotantes de 48 puntos, seguimiento a la derecha, panel con una sola próxima acción y pie persistente. Detalles GPS dentro de una sección secundaria. |
| 7 · Programado sin reservas | Fecha, conductor y vehículo sin estructura; estado vacío genérico de búsqueda; “Cancelar viaje” tiene el mismo peso que comenzar. | Uso del estado vacío global y dos botones llenos para acciones de distinta jerarquía. | Resumen del recorrido, vehículo identificado, conteos reales, vacío específico de pasajeros y un pie con acción principal más cancelación secundaria. |
| 9 · Confirmación | Diálogo oscuro con acento verde azulado sobre una app clara; acciones en mayúsculas y sin contexto del viaje. | Las confirmaciones operativas siguen usando `Alert.alert`, que toma el tema nativo del sistema. | Confirmación propia del tema de Krow, título y consecuencia breves, cancelar/confirmar diferenciados y ejecución solo tras la confirmación explícita. |

La línea casi recta del mapa no demuestra por sí sola un error de cálculo. El componente ya dibuja un trazo discontinuo cuando falta una polilínea calculada. Se conservará esa distinción y se evitará presentar una ubicación imprecisa como una posición exacta.

## Propuesta concreta antes de implementar

1. **Componentes de movilidad:** recorrido de dos puntos, resumen de viaje, datos con icono y resumen de reserva. La tipografía distingue lugar principal de dirección secundaria. Los datos enviados a la API conservan sus valores originales.
2. **Inicio:** una sola entrada principal para buscar/publicar o continuar el viaje, accesos de gestión con iconos y viajes recientes compactos.
3. **Detalle y programado:** contenido organizado por recorrido, salida/vehículo, estado de reservas y acciones. Los conteos reflejan el estado real; no usar “completadas” como resumen universal.
4. **Seguimiento:** mapa estable, controles compactos y panel con encabezado expandible, información relevante y pie persistente. La siguiente acción y la disponibilidad de finalización proceden de las mismas reglas actuales.
5. **Publicación:** progreso compacto; mapa contextual desde la elección de destino; revisión con datos y paradas numeradas. Mantener la selección de avenida y paradas, el recálculo, las rutas favoritas y los tres pasos.
6. **Confirmaciones:** sustituir las confirmaciones críticas de estos flujos por una hoja consistente con el tema, conservando callbacks, protección de doble envío y cancelación al abandonar la pantalla.
7. **Validación:** regresiones de estados, cobros, permisos y navegación; contraste y controles accesibles; compilación del APK actualizado. La apariencia nativa y los FPS solo se darán por comprobados si hay un dispositivo de prueba disponible.

## Límites

No se cambian contratos de API, autenticación, reglas del viaje, asignación de pasajeros ni configuración de servicios. No se introducen cifras, rutas o posiciones ficticias para llenar la pantalla. Los cambios locales de la entrega anterior se conservan y se corrigen sobre su estado actual.

## Implementación realizada

| Flujo | Resultado en el código |
| --- | --- |
| Componentes de viaje | `TripPresentation` reúne recorrido con dos puntos, estados semánticos, datos con iconos, resumen de viaje y filas de actividad. Las direcciones completas siguen disponibles por expansión y para accesibilidad. Los datos compactos pasan a una columna con fuente ampliada. |
| Inicio | Cabecera breve, resumen del viaje activo, acción contextual para continuar, módulo de publicación/búsqueda y accesos de gestión. Los recientes usan direcciones del detalle existente únicamente cuando faltan nombres; se consultan en paralelo y se comparte la caché con el detalle durante diez minutos. Si no hay respuesta, se muestra una descripción honesta sin coordenadas crudas ni geocodificación adicional. |
| Programado | Ruta, salida, vehículo y conductor agrupados; conteos reales; estado vacío específico. Comenzar queda en el pie y cancelar como acción secundaria. Se conserva la preparación de permisos GPS y el bloqueo si hay solicitudes pendientes. |
| Detalle activo e historial | Se distinguen viaje activo, cancelado y completado. Un activo sin reservas ofrece volver al seguimiento; las reservas canceladas de pasajeros no recuperan acceso al mapa. Importe, cobro, efectivo, reseñas y conversación conservan sus acciones y reglas. |
| Seguimiento | Mapa nativo estable, controles flotantes compactos y seguimiento a la derecha. Próxima parada, participantes y tiempo estimado forman el resumen. El panel se abre mediante control accesible o arrastre vertical desde el tirador; el contenido puede desplazarse y el pie queda fuera del scroll. Finalizar sigue condicionado por `canComplete`. Los errores de finalización abren el panel; no se detiene GPS si falla el cierre en la API. |
| Pasajeros | Avatar con iniciales reales, nombre, estado, puntos de subida/bajada y acciones correspondientes. El acceso al chat conserva la reserva de destino. La ubicación imprecisa se comunica con su precisión real y un radio en el mapa; no se anima como ubicación actual cuando está desactualizada. |
| Publicación | Progreso de tres segmentos, origen/destino agrupados y mapa desde el primer paso. La revisión muestra horario, cupo, aportación y recorrido, más paradas ordenadas y expandibles. Los marcadores numerados evitan las confirmaciones sobredimensionadas de la captura. Las validaciones y el payload se conservan. |
| Confirmaciones | Inicio, finalización, cancelaciones, rechazo, ausencia, recálculo y registro de efectivo usan una hoja del tema de Krow. El contenido puede desplazarse con letra grande. Cerrar no ejecuta la operación y dos pulsaciones rápidas de confirmación consumen una sola acción. |
| Listados | Actividad, viajes del conductor y resultados de búsqueda comparten la lectura de ruta y datos compactos. Se conservan filtros, paginación y destinos de navegación. |

Se aplicó la revisión React de componentes, hooks, accesibilidad y renderizado sobre el stack nativo instalado. No se añadieron dependencias ni se trasladó el mapa a una vista web.

## Validación de esta segunda entrega

- TypeScript: correcto.
- ESLint con `--quiet`: sin errores.
- Jest: **33 suites y 200 pruebas correctas**. Las regresiones nuevas cubren nombres de lugares y caché, estados de cancelación, retorno al seguimiento, confirmación explícita, doble toque, cierre fallido y revisión de paradas numeradas. También se ejecutaron las pruebas existentes de permisos, publicación, reservas, chat, autenticación y runtime.
- `git diff --check`: correcto.
- Metro iOS con `--dev false`: correcto; esto verifica el empaquetado de JavaScript, no una compilación Xcode.
- Gradle `assembleTrial`: **correcto**, 2 min 55 s. APK Android con Hermes incluido, ARM64 y ARMv7, Android 7 o posterior.
- APK: firma verificada, `versionCode 7`, `0.5.0-trial`, no depurable, HTTP sin cifrar desactivado. Se comprobó además la presencia de textos nuevos del rediseño en el bytecode empaquetado.

Hay advertencias del renderer de pruebas sobre actualizaciones asíncronas de `ThemeProvider` fuera de `act`; las aserciones pasan. No se presentan estas pruebas de componentes como inspección visual nativa.

La revisión física de composición, letra ampliada, gestos, TalkBack y GPS sigue pendiente: no había un dispositivo conectado ni un emulador Android instalado en la sesión. No se declara que la aplicación esté lista para producción por haber compilado.

El APK de esta entrega usa **0.5.0-trial / versionCode 7**, para distinguirlo del 0.4.0 probado en las capturas. La firma de prueba es la misma, con instalación sobre la versión anterior compatible con esa firma.

Archivo: `artifacts/android/krow-0.5.0-trial.apk` (137.007.366 bytes, aproximadamente 130,7 MiB). Metadatos y comprobaciones en `docs/android-apk-0.5.0-20261020.json`; SHA-256 junto al APK. El archivo 0.4.0 se conserva.

Es un APK firmado para pruebas privadas; la firma de distribución y la revisión física siguen siendo pasos separados de esta entrega.
