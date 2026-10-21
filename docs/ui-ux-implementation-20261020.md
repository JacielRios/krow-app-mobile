# Rediseño e interacciones de KROW · 20 de octubre de 2026

Se implementó la dirección definida en `ui-ux-audit-20261020.md` y las mejoras prioritarias de `premium-interaction-review-20261020.md`, usando las dependencias ya instaladas.

## Sistema compartido

- Modo claro blanco con grises neutros y modo oscuro con fondo `#0A0A0A`. El azul queda para acciones, selección y rutas.
- Roles separados para texto sobre botones primarios, secundarios y destructivos. Colores de estado ajustados para texto pequeño sobre superficies neutras.
- Se eliminaron degradados y materiales translúcidos del sistema. La elevación queda disponible para elementos que realmente flotan.
- `Card` utiliza composición abierta por defecto. Los mensajes de chat y el viaje activo conservan una superficie propia porque representan entidades independientes.
- Tipografía compartida, encabezados compactos con icono de retorno, márgenes adaptables a pantallas estrechas, botones de al menos 48 puntos y campos que crecen con texto multilínea.
- `ListRow` reúne las filas de información, navegación y selección. `SegmentedControl` resuelve los filtros de listas con el mismo patrón.
- Las pantallas antiguas de viaje obtienen su paleta y estilos desde el proveedor común mediante `legacyTheme`; no conservan un tema claro fijo cuando la app está en oscuro.

## Pantallas y composición

| Flujo | Cambios implementados |
| --- | --- |
| Inicio | Viaje activo destacado sin acciones anidadas; rutas favoritas, solicitudes e historial reciente en filas; sección principal abierta. |
| Tus viajes | `FlatList`, filtros segmentados, estados visibles sin tarjetas por viaje y paginación existente. |
| Mis viajes del conductor | Lista virtualizada, filtros comunes, detalle y edición como acciones independientes; restricciones de edición conservadas. |
| Perfil y métricas | Apariencia y modo de viaje como filas de selección; accesos a ayuda y métricas como filas; métricas separadas por líneas. |
| Publicación y rutas favoritas | Vehículos en filas seleccionables, controles de cupo y aportación abiertos, fecha sin contenedor externo, paradas con separadores y acciones compactas en favoritas. Se conservan los tres pasos y todos sus campos. |
| Buscar viaje | Resultados virtualizados, ruta y coincidencias sin paneles dentro de paneles; acciones del resultado sin pulsaciones anidadas. |
| Detalle de búsqueda | Cierre y solicitud fuera del desplazamiento de las paradas; selección con radio y separadores; contenido conservado durante la salida. |
| Selector de lugares | Mapa y búsqueda conservan sus funciones, confirmación fija, foco accesible al título y cancelación de consultas al comenzar el cierre. |
| Viaje programado e historial | Reservas y pasajeros como secciones abiertas con separadores; mismos estados, cobros, confirmaciones, reseñas y acceso al chat. |
| Seguimiento | Panel que cambia de altura con Reanimated; el mapa conserva su tamaño y vista nativa durante la animación. El encuadre recibe el tamaño de destino, sin actualizaciones desde JavaScript en cada fotograma. |
| Runtime y alternativas antiguas | Superficies abiertas, cartografía Mapbox oscura según el tema y carga inicial coherente con el sistema visual; conservadas las banderas y alternativas existentes. |
| Conversación | Burbujas independientes con padding y superficie semántica; envío, reintentos, lectura y paginación conservados. |
| Acceso y registro | Marca más compacta, formulario abierto, selector de rol medido por su ancho real, teclado y áreas táctiles ajustados. |
| Recuperación, contraseña y reportes | Controles compartidos, teclado, avance entre contraseñas, selección de tipo de reporte mediante radio y estados de envío existentes. |
| Splash | Fondo del tema, marca proporcionada y animación breve que respeta reducir movimiento. Se conserva su destino y temporizador de navegación. |

## Movimiento y respuesta

- La navegación de pila conserva transiciones nativas; las excepciones de finalización también respetan reducir movimiento. El cambio entre pestañas es inmediato.
- Modales y alertas coordinan opacidad del fondo y movimiento del contenido mediante el controlador nativo de `Animated`. Permanecen montados durante la salida; una finalización antigua no puede cerrar una reapertura reciente.
- Al cerrar un selector, sus consultas se cancelan aunque el contenido siga visible durante la animación. Las respuestas tardías no pueden confirmar ubicaciones.
- Los controles conservan respuesta de pulsación sin sombras decorativas. Con reducir movimiento, la respuesta utiliza opacidad inmediata.
- Los skeletons detienen su animación al pasar la aplicación a segundo plano y permiten desactivarla mediante `active`.
- Slider y dial evitan emitir repetidamente el mismo valor durante un gesto. Se conservan ajustes accesibles, límites, botones y uso del desplazamiento vertical.

## Validación

Resultados finales:

- `npm run typecheck`: correcto.
- `npm run lint -- --quiet`: sin errores.
- Jest: **31 suites y 183 pruebas correctas**. Incluye publicación, búsqueda, reservas, chat, rutas, runtime, teclado y accesibilidad, más regresiones nuevas para presencia de modales, acciones de listas filtradas y contraste de los dos temas.
- Metro con `--dev false`, plataforma Android: correcto.
- Metro con `--dev false`, plataforma iOS: correcto.
- `git diff --check`: correcto.

Las pruebas de contraste verifican al menos 4.5:1 para texto normal y etiquetas de acciones, y 3:1 para el contorno de campos respecto de su superficie, en ambos temas. Esto valida esos pares de tokens; no sustituye una auditoría de accesibilidad sobre la interfaz renderizada.

Los empaquetados Metro de Android e iOS verifican la resolución y transformación de JavaScript y recursos. No equivalen a una compilación Gradle/Xcode ni a una prueba visual nativa.

No hubo un dispositivo o emulador accesible para esta sesión. Quedan por verificar físicamente: composición con teclado y letra ampliada, VoiceOver/TalkBack, regreso del foco, gestos del dial, expansión del panel y fluidez con GPS real. No se afirma una medición de 60 FPS ni un ahorro de memoria.

## Alcance conservado

No se instalaron ni actualizaron dependencias. No se modificaron backend, contratos API, autenticación, reglas de publicación, cálculo geográfico, asignación de pasajeros o banderas de activación. Se preservaron los cambios locales que ya existían en el repositorio.

Gesture Handler, Bottom Sheet, haptics, Moti y Skia no se incorporaron: la primera entrega se resuelve con las herramientas existentes. La incorporación de gestos de arrastre a un panel o de háptica sigue siendo una mejora opcional que requiere prueba en dispositivo.
