# KROW · Diagnóstico UX antes de implementar

23 de octubre de 2026. Alcance: aplicación móvil React Native, flujos piloto y runtime, con lectura de contratos y reglas del backend. Las observaciones de interfaz proceden del código; no se dispone de una sesión móvil conectada ni de capturas de Uber instaladas.

## Evidencia REA

Se abrió `artifacts/android/krow-0.8.1-trial.apk` con REA 6.7.0. SHA-256: `f0af920e6af0b2c81de9558f206ed48fad41c03b917f0153444a7cf08e416769`, coincidente con el registro de compilación. La inspección retuvo 1491 entradas, sin contradicciones de integridad. Se verificaron las entradas `AndroidManifest.xml`, `assets/fonts/MaterialIcons.ttf` y `assets/index.android.bundle` (3981792 bytes).

- Inventario completo retenido: `ev_0c4e2b9df188a289e931487e899cfc4b1226e24de25cd6280f3125686be26b2f`.
- Resumen: `ev_3de8b8c5807e38430d155b78f0a7d18da0448353d51e2eb165bfc5cf1d60e704`.
- Entradas seleccionadas: `ev_48a4209e37b806c1dbc0ed7f9a49af77513f7ac0eda27015293456747bf4c989`.

Este inventario acredita el artefacto distribuido, no su ejecución ni la equivalencia de las fuentes actuales con su bundle Hermes. JADX y ADB no están disponibles en la sesión REA. La inspección de pantallas y negocio se realiza sobre las fuentes con herramientas normales, según la guía de REA; no se presenta como descompilación ni como prueba visual.

## Referencias y adaptación

[Uber para pasajeros](https://www.uber.com/us/en/ride/how-it-works/) expone destino, punto de encuentro, precio y vehículo como contexto de cada decisión. [Uber Driver](https://www.uber.com/gb/en/drive/basics/how-to-take-trips/) organiza la interacción alrededor de aceptar, recoger, iniciar y completar. [Ayuda de efectivo para conductores](https://help.uber.com/en/driving-and-delivering/article/managing-cash-trips?nodeId=bd108fcd-ddd9-4e10-ab69-ed735137e935) destaca el importe que se debe recibir al cerrar el recorrido.

Se toman de estas referencias la jerarquía, el contexto junto a la acción y la presentación progresiva de detalles. KROW mantiene viajes universitarios programados, aprobación de reservas y paradas de catálogo. No se incorpora asignación automática, tarifa dinámica, cuenta regresiva, monedero ni cambio de método de pago.

## Diferencias principales y decisiones

| Área | Implementación actual | Mejora compatible |
| --- | --- | --- |
| Inicio y navegación | Inicio/Viajes/Perfil, acceso a solicitudes, estado activo y tema compartido ya existen. | Conservar destinos y arquitectura; concentrar el rediseño en las decisiones del viaje. |
| Búsqueda y selección | El detalle de búsqueda coloca mapa, conductor y muchos datos antes de elegir la bajada. El pie no resume el compromiso seleccionado. | Dar prioridad a la bajada y mostrar selección e importe junto al CTA fijo. Conservar mapa, catálogo, orden y payload. |
| Publicación | Tres pasos con revisión, recurrencia y paradas seleccionadas. | Reforzar qué se publicará y el precio por asiento; aclarar efectivo únicamente donde el modo lo garantiza. |
| Solicitudes | La bandeja mezcla información con distinta urgencia; cada tarjeta dedica espacio similar a ruta global, reserva y acciones. No hay esqueleto inicial. | Separar visualmente las que requieren respuesta del resto y compactar el contexto secundario. Mantener revalidación, locks, acuses y acciones. |
| Efectivo | Importe y estado aparecen como datos de igual jerarquía; el conductor confirma en un diálogo genérico. | Resumen monetario compartido con estado explícito, lenguaje por rol e importe en la confirmación existente. |
| Viaje activo piloto | Mapa con panel animado, pero confirmar subida/bajada exige expandir el panel. | Mostrar movimientos de la próxima parada en el panel inicial; conservar detalles GPS y herramientas secundarias bajo expansión. |
| Runtime | Estados de reserva en inglés y acciones con jerarquía visual parecida. | Reutilizar estado legible y diferenciar visualmente acciones principales, secundarias y destructivas, sin cambiar comandos ni bloqueos. |
| Mapas | Ruta persistida por servidor, recenter, paradas y posición con antigüedad ya implementados. | Mantener cámara y datos; mejorar el contexto de próxima parada y no presentar GPS antiguo como vivo. |
| Interacciones | `AnimatedPressable`, `AnimatedModal`, `ExpandablePanel`, `Dialog` y reducción de movimiento ya existen. | Reutilizar estas bases para nuevos controles; no añadir librerías, animaciones decorativas ni ciclos sobre mapas. |

## Invariantes obligatorias

- No modificar servicios API, base de datos, contratos, flags, matching ni cálculo de rutas o importes.
- La confirmación de una solicitud sigue siendo del servidor. Mantener revalidación previa, exclusión de doble pulsación y protección de datos no frescos.
- El importe comprometido de reserva procede de los datos de la reserva; el precio por asiento no lo sustituye.
- Solo el conductor registra efectivo recibido en los estados admitidos. El pasajero consulta. Finalizar el viaje no exige cobrar previamente.
- Preservar diferencias entre inicio piloto y runtime V2, confirmaciones de pasajeros, condiciones de finalización, navegación offline y restricciones por movimiento.
- Mantener catálogo, selección explícita de bajada y paradas válidas; no habilitar puntos arbitrarios.
- Los avisos se marcan vistos únicamente con la interacción explícita existente.

## Verificación prevista

TypeScript, ESLint, pruebas de flujos existentes y nuevas regresiones para presentación de efectivo, prioridad de solicitudes y acciones visibles de próxima parada. Generar bundles Metro Android/iOS si el entorno lo permite. El QA visual nativo, TalkBack/VoiceOver, GPS real y recepción push requieren un dispositivo; no se certificarán con Jest ni con inventario REA.
