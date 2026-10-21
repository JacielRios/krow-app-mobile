# KROW · Revisión e implementación de UI/UX

21 de octubre de 2026. Implementación sobre el árbol de trabajo existente, conservando los cambios locales previos. El backend y los contratos de datos no se modificaron.

Se revisaron los 87 archivos TSX de `src`: navegación, pantallas y componentes. Hay 27 archivos llamados `*Screen.tsx`: 26 contienen implementaciones y `features/ride/screens/ChatScreen.tsx` está vacío. El inventario complementario registra los controles y etiquetas encontrados en el código; sus cantidades representan declaraciones JSX, no el número de elementos que pueden aparecer al recorrer listas.

**Arquitectura y decisión de bibliotecas**

KROW utiliza React Native 0.84.1, React Navigation, temas propios en `shared/theme`, componentes `ui-v2` y adaptadores de compatibilidad en `shared/components/ui`. MaterialIcons de `react-native-vector-icons` 10.3.0 ya es la familia utilizada en la aplicación. La animación de pulsación utiliza `Animated` y el seguimiento mantiene sus componentes Reanimated existentes.

La actualización amplía estos componentes compartidos. Conserva el azul, la paleta neutra, ambos temas y el lenguaje en español. Las variantes de acción estándar, rellena, tonal y delineada toman como referencia los [patrones de icon buttons de Material Design](https://material-web.dev/components/icon-button/). Las etiquetas, estados y áreas interactivas utilizan las APIs de [accesibilidad](https://reactnative.dev/docs/accessibility) y [Pressable](https://reactnative.dev/docs/pressable) de React Native.

| Alternativa investigada | Evaluación para KROW |
| --- | --- |
| [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons) | Se reutiliza la instalación y la familia MaterialIcons existentes. No se cambia de paquete durante esta actualización visual. |
| [React Native Paper](https://www.callstack.com/blog/react-native-paper-5-0) | Ofrece componentes Material Design 3. KROW ya dispone de proveedor de temas, botones, campos, modales y filas; incorporar otro sistema completo duplicaría esas responsabilidades. |
| [Lucide para React Native](https://lucide.dev/guide/react-native) | Ofrece iconos como componentes. Se conserva la familia Material existente para mantener consistencia y evitar una segunda biblioteca de iconografía. |
| Skills del entorno | Se aplicó `vercel:react-best-practices` a composición, hooks, accesibilidad y coste de renderizado. Las skills de sitios web, diagramas e imágenes no aportaban una mejora necesaria a estos componentes nativos. |

No se instalaron ni actualizaron dependencias. La selección de bibliotecas se resolvió antes de editar los componentes.

**Hallazgos y correcciones transversales**

| Hallazgo | Implementación |
| --- | --- |
| Acciones utilitarias repetidas con botones de texto y diferentes formas | `IconButton` circular compartido: volver, cerrar, editar, eliminar, actualizar, enviar y ajustar valores. |
| Controles de icono sin contrato común de carga o selección | Etiqueta accesible obligatoria, selección visual, indicador de actividad y bloqueo del control durante carga. Se conserva la API anterior que recibe un nodo `icon`. |
| Demasiado peso visual en acciones secundarias | Variante tonal, delineado transparente, formas redondeadas y jerarquía entre acción principal y secundaria. |
| Respuesta centrada solo en escala u opacidad | Capa de estado para pulsación y foco, animada con el controlador nativo. Se conserva la preferencia de reducir movimiento y se reinicia la pulsación al deshabilitarse. |
| Selectores de paradas representados como botones completos | Filas de selección con dirección legible, radio y estado marcado. |
| Valoraciones duplicadas | Una implementación compartida con adaptación de la API antigua; una opción marcada y valores de solo lectura sin cinco controles deshabilitados. |
| Registro de la fuente ausente en iOS | `Info.plist` declara `MaterialIcons.ttf`, que el pod existente ya incluye como recurso. No cambia el proyecto Xcode ni sus dependencias. |

Los controles de icono mantienen una superficie de 48 × 48 puntos como mínimo y glifos de 24 puntos por defecto; los iconos de los botones con texto usan 20 puntos. El texto de las acciones principales puede crecer en altura. Los botones de publicación, reserva, aceptación, rechazo, cancelación, cobro, reporte y finalización conservan nombres explícitos. La eliminación de una ruta mantiene su confirmación.

**Cobertura por pantalla y flujo**

| Pantalla o componente | Resultado |
| --- | --- |
| `SplashScreen` | Revisión del tema y transición existentes; sin acciones que reemplazar. |
| `LoginScreen` | Visibilidad de contraseña con el control compartido, etiquetas de modo de viaje y acción principal identificable. |
| `RegisterScreen` | Acción principal coherente y enlace de acceso con área mínima de 48 puntos. |
| `RecoverScreen` | Recuperación con texto e icono; reenvío conserva una etiqueta explícita. |
| `PasswordResetScreen` | Guardado identificado y botones compartidos con carga y bloqueo existentes. |
| `HomeScreen` | Búsqueda o publicación reconocible, manteniendo la prioridad del viaje activo y los accesos existentes. |
| `MainTabs` | Indicador tonal de destino seleccionado, iconografía Material y etiquetas visibles de Inicio, Viajes y Perfil. |
| `ActivityScreen` | Filtros segmentados con selección tonal; actualizar información guardada conserva texto y añade identificación visual. |
| `DriverTripsScreen` | Edición mediante icono; bloqueo visible y explicación de reservas conservados. Abrir viaje sigue siendo una acción con texto. |
| `FavoriteRoutesScreen` | Publicar desde la ruta como acción tonal; editar y eliminar como utilidades con etiquetas que incluyen el nombre de la ruta. |
| `PublishRideScreen` | Retorno compartido en cabecera y pie, más espacio para continuar/publicar, respuesta de pulsación y semántica de selección en rutas y avenidas. Se conservan los tres pasos. |
| `RequestRideScreen` | Cierre compacto del detalle, búsqueda y solicitud con texto; filtros, selección de paradas y bloqueo durante solicitud conservados. |
| `PlacePicker` | Cierre circular; mapa y búsqueda siguen identificados con texto; confirmar ubicación conserva su CTA. |
| `PlacesAutocompleteInput` | Borrado de dirección compartido y reintento con área táctil suficiente. |
| `RoutePreviewMap` | Centrar y seguir vehículo usan el mismo control de icono; seguimiento seleccionado dispone de fondo tonal. |
| `RideInvitationScreen` | Subida y bajada como filas con radio, direcciones completas y etiquetas contextuales. La solicitud deliberada sigue siendo un botón principal. |
| `BookingRequestsScreen`, `BookingNoticeCard`, `BookingEventsHost` | Actualización mediante los botones, filas y modales compartidos. Aceptar, rechazar, abrir detalle y posponer conservan sus nombres y restricciones. |
| `ScheduledScreen` | Invitación y chat con jerarquía tonal; comenzar, responder solicitudes y cancelar conservan texto y confirmaciones. |
| `TrackingScreen` | Utilidades del mapa y chat unificadas; alternancia entre mapa y detalles con estado expandido; finalizar y contactar mantienen claridad. |
| `ChatScreen` de piloto | Campo compacto y multilínea junto al icono de envío o reintento. Se conservan el borrador fallido, identificador idempotente, paginación, lectura y protección frente a doble envío. |
| `HistoryScreen` | Cobro, calificación y retorno al seguimiento conservan texto; acceso a conversación con jerarquía tonal y valoración compartida. |
| `ProfileScreen` | Edición junto al nombre; preferencias y ayuda con iconos consistentes; selección tonal de apariencia y modo. Cierre de sesión y cuenta conservan etiquetas y confirmaciones. |
| `DriverMetricsScreen` | Actualizar se traslada a la cabecera con carga; los indicadores y estados vacíos se conservan. |
| `ReportIncidentScreen` | Categorías con las filas de selección compartidas; el envío conserva texto, carga y estado enviado. |
| `RideScheduledScreen` de compatibilidad | Retorno compartido y estilos globales de acción; aceptar, iniciar y cancelar conservan sus manejadores. |
| `DriverActiveRideScreen` de compatibilidad | Retorno compartido; completar paradas y finalizar mantienen acciones explícitas. |
| `PassengerActiveRideScreen` de compatibilidad | Retorno compartido, estados y recorrido existentes. |
| `RuntimeRideScreen` | Retorno circular, título flexible y menor énfasis para acciones secundarias. Los comandos, cola, conflictos y límites de movimiento siguen intactos. |
| `DriverFinishedRideScreen`, `PassengerFinishedRideScreen` antiguos | Temas reactivos, cierre circular con área segura y valoraciones compartidas. Son prototipos sin ruta registrada actualmente; sus datos de demostración no se conectaron a producción. Las rutas de finalización registradas siguen abriendo `HistoryScreen`. |
| `features/ride/screens/ChatScreen.tsx` | Archivo vacío, sin ruta funcional. La conversación registrada sigue utilizando el chat de piloto. |

Los adaptadores `ui/Button` y `ui/IconButton` siguen apuntando a `ui-v2`. `Dropdown`, `DropdownInput`, `SectionHeader`, `Input`, `ValueSlider`, `RecurrencePicker`, `ListRow`, `ScreenHeader` y `SegmentedControl` reutilizan el mismo sistema. Repetir fechas utiliza un `Switch` nativo; su respuesta táctil depende del sistema operativo. No se añadió una biblioteca de háptica.

**Navegación y comportamiento conservados**

Se revisaron `AuthNavigator`, `RootNavigator`, `MainNavigator`, `MainTabs` y `RuntimeEntry`. No cambiaron los nombres, parámetros o destinos de las rutas ni las banderas. `RuntimeEntry` conserva sus variantes runtime, piloto y compatibilidad. Las rutas de finalización continúan mostrando el historial protegido. El sistema de autenticación y los enlaces de acceso mantienen su comportamiento.

La comparación de los manejadores JSX antes y después conserva los callbacks de navegación, envío, búsqueda, publicación y reservas. Las adaptaciones de interacción son el cambio de `onPress` a `onValueChange` para el switch y el adaptador de valoración compartida. No se editaron APIs, hooks de negocio, cálculos geográficos, control de cupo, cachés ni permisos de publicación.

**Verificación y límites**

| Comprobación | Resultado |
| --- | --- |
| TypeScript | `npm run typecheck`, correcto. |
| ESLint | `npm run lint -- --quiet`, correcto. |
| Jest completo | 45 suites y 277 pruebas correctas, con `--runInBand --cacheDirectory .tmp/jest-ui-actions --testTimeout=15000`. |
| Cobertura funcional | Publicación, búsqueda, selección ordenada de paradas, reservas, chat, navegación, runtime, permisos, caché, temas y contraste. |
| Nuevas regresiones | Estado de iconos en ambos temas, carga y bloqueo, API anterior de iconos, conservación del nombre de una acción durante carga, valoración accesible y contraste tonal. Se actualizaron los selectores de pruebas existentes para consultar acciones por etiqueta. |
| Iconografía | Inventario estático sin nombres literales de icono desconocidos ni `IconButton` sin etiqueta. |
| Metro Android | Paquete de producción generado y recursos copiados. |
| Metro iOS | Paquete de producción generado y recursos copiados. |
| Recursos iOS | XML de `Info.plist` válido; declaración y archivo `MaterialIcons.ttf` comprobados. |
| Espacios de Git | `git diff --check`, sin errores de espacios. |

La ejecución inicial de Jest encontró una restricción en la caché temporal del entorno; se resolvió usando una caché dentro del proyecto. Una ejecución en frío también alcanzó el límite inicial de cinco segundos de una prueba de búsqueda. La ejecución final usa quince segundos por prueba sin cambiar sus aserciones. Persisten avisos de `act` en algunas pruebas existentes; no hubo fallos en la ejecución final.

La revisión de adaptación considera anchos de 320, 390 y 768 puntos: márgenes de `ScreenContainer` de 16/20 puntos, acciones que pueden envolver en favoritas, texto sin altura fija en botones, campo de chat flexible, título flexible en runtime y pie de publicación con acción principal flexible. Se revisaron estas restricciones en el código; no se presenta como una medición de la interfaz renderizada.

ADB no encontró dispositivos conectados y el entorno no dispone de emulador Android ni de Xcode/iOS. Por ello los paquetes Metro no equivalen a compilaciones Gradle/Xcode o a validación visual nativa. Quedan por comprobar en dispositivos: distribución a esos anchos y con letra ampliada, teclado abierto, VoiceOver/TalkBack, foco con teclado físico, respuesta táctil nativa, mapas, GPS y gestos. No se afirma una certificación de accesibilidad, una medición de fluidez o ausencia de recortes en dispositivos.

El inventario completo está en [ui-actions-inventory-20261021.json](ui-actions-inventory-20261021.json). Las evidencias locales de pruebas y empaquetado se conservan en `.tmp/ui-actions-20261021/`.
