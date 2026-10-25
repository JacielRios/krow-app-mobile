# KROW · Rediseño de la experiencia de movilidad

23 de octubre de 2026. Implementación local sobre React Native y los componentes existentes. El [diagnóstico previo](ux-mobility-audit-20261023.md) recoge las diferencias y referencias oficiales de Uber/Uber Driver antes de editar.

## Resultado implementado

| Flujo | Cambio y propósito |
| --- | --- |
| Buscar y solicitar | El detalle comienza por elegir la bajada en mapa o lista. La información secundaria queda después. El pie fijo resume la parada seleccionada, el total del único asiento que solicita el flujo actual y la necesidad de aprobación. |
| Paradas | La recomendación y la dirección se presentan por separado; las seleccionadas tienen borde y superficie tonal. Se mantienen los mismos IDs, orden, validaciones y geometría. |
| Publicar | Se refuerza la selección visual de paradas y se aclara el precio por asiento en revisión. La referencia a efectivo en búsqueda, tarjeta y publicación aparece únicamente con el modo piloto habilitado. |
| Solicitudes | La bandeja presenta primero las solicitudes que el servidor permite responder y después respuestas y actividad. Distingue carga, error y vacío; no muestra una bandeja vacía durante la recuperación de cuenta. |
| Avisos | La tarjeta explica la siguiente acción y diferencia solicitud enviada de lugar confirmado. La subida, bajada, lugares e importe total quedan como contexto de la decisión. Se mantienen aceptar, rechazar, posponer y acuse explícito. |
| Reserva | El progreso presenta el hito actual, etapa y una guía breve en una composición compacta. No asigna hitos cumplidos a reservas canceladas ni deduce eventos por tiempo o proximidad. |
| Efectivo | `CashPaymentSummary` muestra el importe comprometido de la reserva, MXN y el estado real. Diferencia pendiente, recibido, anulado y desconocido; utiliza texto por rol. El conductor confirma el importe antes del registro existente. |
| Seguimiento piloto | El pie del mapa ofrece la primera subida o bajada pendiente con el nombre del pasajero. La lista conserva las otras acciones. El control del panel permite abrir los detalles secundarios sin ocultar el CTA. El mapa conserva su instancia y sus datos. |
| Pantallas pequeñas | La altura expandida del panel nunca es inferior a la contraída ni supera el espacio disponible. Las filas y textos pueden crecer y ajustarse al ancho. |
| Runtime V2 | Las solicitudes muestran las paradas solicitadas y las reservas utilizan estados legibles en español. Se conserva la preparación offline, bloqueo por movimiento, comandos y condiciones propias de ese motor. |
| Interacciones | Se reutilizan `Button` v2, `AnimatedPressable`, `AnimatedModal`, `PanelHandle` y `ExpandablePanel`: presión, expansión y transiciones existentes respetan reducción de movimiento. No se añadieron dependencias ni animaciones continuas sobre el mapa. |

## Reglas y arquitectura preservadas

La API y el backend no tienen modificaciones. No cambiaron contratos, tablas, hooks de negocio, flags de activación, matching, importes persistidos, capacidad, selección de paradas ni comandos. Piloto y runtime mantienen sus condiciones diferentes de inicio y finalización.

La UI sigue revalidando solicitudes antes de aceptar, bloqueando dobles pulsaciones y evitando actuar sobre información no fresca. El pasajero consulta el efectivo; el conductor lo registra en los estados admitidos. Finalizar no exige cobrar previamente. Los textos y las animaciones no confirman operaciones antes de la respuesta correspondiente.

El CTA fijo del seguimiento reutiliza la primera acción de las listas existentes; no ejecuta movimientos automáticamente ni impide elegir las demás acciones de la parada. Los errores de GPS, permisos y finalización siguen siendo recuperables. La posición antigua no se presenta como GPS vivo.

## Evidencia y validación

- REA 6.7.0 verificó la identidad y el inventario del APK 0.8.1 existente. La [evidencia guardada](ux-mobility-rea-20261023.json) incluye IDs, hash, entradas inspeccionadas y límites. No se ejecutó ni se descompiló ese APK para inferir pantallas; el análisis de flujos se realizó sobre las fuentes disponibles.
- El inventario completo de REA también se exportó a `.tmp/ux-mobility-20261023/rea-evidence.json` antes de cerrar la sesión: 4 registros de evidencia, 3342522 bytes.
- **TypeScript:** `npm run typecheck`, correcto.
- **ESLint:** `npm run lint -- --quiet`, sin errores. No se afirma ausencia de advertencias de patrones existentes.
- **Jest completo:** 50 suites, 310 pruebas, todas correctas. Incluye prioridades de bandeja, información antigua, selección de bajada, permisos, efectivo por rol, confirmación deliberada, doble toque, hitos de reserva, altura del panel, mapas, offline y reglas de viaje.
- **Metro de producción:** Android e iOS generados. Se compararon los mapas de fuentes con los 12 archivos de interfaz modificados: los 12 coinciden en ambas plataformas. Esto valida el empaquetado JavaScript; no equivale a compilar o ejecutar nativamente iOS.
- Nuevos nombres de iconos verificados contra el archivo de glifos instalado. `git diff --check` correcto.
- [Registro de pruebas y hashes de bundles](ux-mobility-validation-20261023.json). Los bundles, mapas y resultados completos están en `.tmp/ux-mobility-20261023/`.

Las primeras ejecuciones necesitaron una caché de Jest dentro del workspace por restricciones de escritura en Temp. Se corrigieron aserciones de pruebas nuevas que intentaban serializar controles con referencias circulares. Hubo un timeout inicial bajo carga; la ejecución completa final utilizó un límite de 15 segundos por prueba, con 310 aprobadas. Permanecen advertencias `act(...)` en pruebas existentes del tema; no se ocultaron sus mensajes en los archivos de resultados.

## Aceptación nativa pendiente

`adb devices -l` devolvió una lista vacía. No hay ejecución visual móvil, capturas de antes/después ni certificación de equivalencia con Uber. Queda por revisar en Android e iOS: 320/390 puntos, horizontal, fuente ampliada, teclado, foco de modales, TalkBack/VoiceOver, tacto, fluidez, GPS y push reales. La revisión de adaptación realizada aquí es estructural y mediante pruebas de componentes.

Posteriormente, a solicitud del usuario, se generó `artifacts/android/krow-0.9.0-trial.apk`, código 15, con el mismo paquete y certificado de prueba para actualizar instalaciones anteriores. Gradle terminó correctamente en 3 min 56 s. Se verificaron firma, Android mínimo 24, Hermes, ARM64/ARM de 32 bits y la coincidencia de los 12 archivos del rediseño con el mapa de fuentes de la compilación. El bytecode extraído del APK coincide con el generado e incluye los textos nuevos. La [verificación del APK](android-apk-0.9.0-20261023.json) contiene tamaño, SHA-256 y comprobaciones. El APK no necesita Metro. No se publicó en una tienda ni se instaló en un dispositivo.
