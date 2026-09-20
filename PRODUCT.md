# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- Estudiantes que ofrecen viajes como conductores aprobados y necesitan publicar, reutilizar y administrar sus recorridos.
- Estudiantes pasajeros que buscan viajes y deben escoger puntos de subida y bajada permitidos.

## Product Purpose

KROW es una plataforma de carpool universitario. Conecta estudiantes mediante viajes programados, vehículos verificados, reservas y paradas de transporte administradas por la plataforma.

## Positioning

La coincidencia entre conductor y pasajero se hace sobre paradas KROW cercanas a la ruta real, no sobre puntos arbitrarios ni únicamente sobre los extremos del viaje.

## Operating Context

- Aplicación React Native para iOS y Android.
- Los conductores crean rutas, seleccionan paradas compatibles, configuran el viaje y revisan antes de publicar.
- Los pasajeros buscan por origen y destino deseados y eligen un par ordenado de paradas permitidas.
- NestJS recalcula rutas con Google Maps y persiste las operaciones mediante Supabase con RLS.

## Capabilities and Constraints

- Solo conductores aprobados pueden publicar.
- La capacidad del vehículo incluye al conductor; los lugares ofrecibles son capacidad menos uno.
- Las paradas válidas provienen del catálogo curado por KROW y deben estar a un máximo de 500 metros.
- Una ruta favorita existe independientemente de un viaje y puede guardar vehículo, lugares y precio predeterminados.
- La publicación es atómica y no existen borradores persistentes.
- Un viaje solo se edita cuando está programado y no tiene reservas pendientes, confirmadas o en curso.
- El pasajero debe seleccionar subida y bajada del mismo viaje, con la bajada después de la subida.
- Google Maps se consume desde el backend; el móvil no decide la geometría persistida.

## Brand Commitments

- Nombre del producto: KROW.
- Mantener la identidad, tokens, componentes y tono en español existentes.
- La interfaz operativa debe priorizar claridad, confianza y velocidad sobre ornamentación.

## Evidence on Hand

- Sistema visual existente en `src/shared/theme` y `src/shared/components/ui-v2`.
- Flujo actual de publicación, búsqueda, viaje programado y viaje activo en `src/features/ride`.
- No existe todavía un CSV productivo de paradas; la interfaz debe mostrar un estado vacío honesto y no fabricar datos.

## Product Principles

- La seguridad y la validez de la ruta se comprueban en el servidor.
- Cada decisión crítica debe ser revisable antes de confirmar.
- Las rutas frecuentes aceleran el trabajo sin saltarse la revalidación.
- Los estados vacíos y de bloqueo explican la causa y la siguiente acción.
- Los viajes históricos conservan su contexto aunque la ruta se edite.

## Accessibility & Inclusion

- Controles táctiles claros, contraste suficiente, estados accesibles y etiquetas comprensibles.
- Fechas, moneda y lenguaje se presentan para estudiantes en México.
