# KROW · Auditoría de interfaz y propuesta de rediseño

Fecha: 20 de octubre de 2026. Estado: propuesta definida; implementación pendiente. No se modificó el código de la aplicación para elaborar este documento.

## 1. Alcance y evidencia

Se revisaron la navegación, las 24 pantallas con contenido del árbol `src/features`, los componentes visuales compartidos y de viajes, el sistema de temas, los mapas y la documentación de validación existente. La revisión abarca las variantes piloto, runtime y compatibilidad, además de archivos antiguos sin una ruta registrada actualmente. `src/features/ride/screens/ChatScreen.tsx` está vacío; la conversación registrada utiliza `features/pilot/ChatScreen.tsx`.

La configuración local consultada habilita piloto y seguimiento; deshabilita runtime, push piloto y cierre de cuenta. Esto describe los archivos locales, no certifica qué configuración lleva una instalación distribuida.

Las cuatro capturas adjuntas pertenecen a Uber Driver y se usan exclusivamente como referencias de composición. No son capturas de KROW. No se encontró un emulador abierto ni un conjunto de capturas actuales de KROW en los directorios de evidencias revisados. Por tanto:

- Los hallazgos sobre estilos, composición, rutas y jerarquía están sustentados en el código actual.
- Los problemas de recorte, contraste efectivo, interacción y rendimiento indicados como riesgos requieren verificación en dispositivo.
- Esta auditoría no equivale a una certificación visual ni funcional en Android o iOS.
- `npm run typecheck` terminó correctamente durante la revisión. No se ejecutó una nueva batería de pruebas funcionales, ya que no hubo cambios de implementación.

El repositorio ya tenía cambios locales en mapas, seguimiento, perfil, navegación, diagnósticos y archivos nativos. Se conservaron. La propuesta parte del árbol de trabajo actual, incluidos esos cambios.

Se preparó una vista ilustrativa independiente con Inicio, Viajes y Perfil, cambio de apariencia y modo pasajero/conductor. Se comprobó su distribución en anchos de 320, 390 y 736, ambos temas, sin desbordamientos detectados ni errores JavaScript; también se verificó el cambio de rol. Es una referencia de composición con datos ficticios, no una captura de la app ni una validación de sus componentes nativos. El mapa y los flujos completos siguen especificados en la matriz de este documento.

## 2. Diagnóstico principal

La fragmentación visual nace tanto en los componentes base como en la composición de las pantallas. Cambiar únicamente la paleta o quitar bordes locales dejaría intactas las causas.

### Hallazgos transversales

| Prioridad | Hallazgo comprobado | Evidencia | Consecuencia y decisión |
| --- | --- | --- | --- |
| P0 | El tema oscuro es azul marino en todos sus niveles: `#09111E`, `#111D2E`, `#18263A`, `#213149`. | `src/shared/theme/themes.ts` | Sustituir las superficies por negros y grises neutros; azul solo para acciones y selección. |
| P0 | `Surface` aplica `glass()` y elevación 2 por defecto. `glass()` agrega borde, transparencia y degradado incluso cuando `bordered` es falso. | `shared/components/ui-v2/Surface.tsx`, `shared/theme/materials.ts` | Hacer que las propiedades describan realmente el resultado. Superficie simple y opaca por defecto; borde y elevación solo explícitos. |
| P0 | `Card` usa vidrio en todas sus variantes. `flat` elimina elevación pero conserva ese material; `outlined` también recibe elevación 2. | `shared/components/ui-v2/Card.tsx` | Corregir la semántica de variantes y revisar sus consumidores. Una tarjeta plana no debe conservar decoración oculta. |
| P0 | Coexisten paleta estática y tema reactivo. Hay 21 archivos TSX que importan `theme/colors`; algunas importaciones son solo residuales y otras sí controlan la apariencia. | `shared/theme/colors.ts`, pantallas de compatibilidad, `Avatar`, `DropdownInput` | Clasificar cada uso y migrar los visualmente activos al tema semántico. No basta con reemplazar importaciones en bloque. |
| P1 | Hay 15 archivos TS/TSX con llamadas a `glass`, `depth` o `canvas`, incluidos los materiales. | Sistema compartido, login, controles y runtime | Reducir decoración desde la base y en usos directos. Los conteos describen código, no cantidad de elementos visibles. |
| P1 | Cada botón salvo `text` recibe borde, degradado y sombra; `ghost` es una superficie azul y también elevada. | `ui-v2/Button.tsx` | Primario sólido; secundario neutro; texto y acciones de fila sin sombra. |
| P1 | Historial, actividad, perfil y métricas agrupan casi cada bloque en una tarjeta. | `HomeScreen`, `ActivityScreen`, `ProfileScreen`, `DriverMetricsScreen`, `HistoryScreen` | Cambiar a secciones abiertas y filas con separadores. Conservar contenedores solo para entidades o tareas independientes. |
| P1 | `ScreenHeader` ofrece un botón «Volver» en una fila separada; otras pantallas dibujan su propio encabezado horizontal. | `ui-v2/ScreenHeader.tsx`, publicación, compatibilidad | Unificar encabezado compacto de flujo y título grande de sección principal. |
| P1 | Tipografía compartida limitada a cuatro variantes, con muchos tamaños locales. Hay etiquetas de 12–13 y un texto de 10 en el dial. | `ui-v2/Text.tsx`, `PlacePicker`, `SeatDial`, controles de aportación | Definir estilos por función; aumentar textos que contienen instrucciones y datos necesarios. |
| P1 | Se repiten acciones dentro de una entidad ya pulsable y botones principales entre sí. | Viaje activo y recientes en Home; `RideCard`; `DriverTripsScreen` | Evitar controles pulsables anidados. Una fila abre detalle; las acciones adicionales tienen una región independiente. |
| P1 | Los paneles y estados no usan un patrón único. `FeedbackState` reserva 48 de espaciado vertical; `RuntimeEntry` aún presenta carga/error en un `View` básico. | `FeedbackState`, `RuntimeEntry` | Estados de página y estados compactos de sección, ambos con causa y siguiente acción. |
| P1 | Algunas listas crecientes se dibujan mediante `.map()` dentro de `ScrollView`. | Actividad, resultados y viajes del conductor | Registrar el riesgo de renderizar todo el historial. Reutilizar listas virtualizadas cuando el tamaño y las mediciones lo justifiquen, conservando la paginación actual. |
| P1 | Google Maps recibe estilos del tema; Mapbox runtime fija `StyleURL.Street`. | `RoutePreviewMap.tsx`, `RuntimeRideScreen.tsx` | Alinear la apariencia del mapa con cada tema sin sustituir motores ni alterar geometrías. |
| P2 | Hay dos `StarRating`, dos selectores dropdown y bloques de conductor/vehículo duplicados. Algunos no consumen el tema. | `shared/components/ui`, `ride/components`, compatibilidad | Consolidar presentación con adaptadores y conservar interfaces existentes donde hagan falta. No crear `ui-v3`. |

P0 identifica bases que deben resolverse antes de extender el rediseño. P1 corresponde a composición y usabilidad. P2 corresponde a consistencia y mantenimiento. No es una clasificación de incidentes funcionales.

### Lo que ya funciona como base

- `ThemeProvider` mantiene `system | light | dark`, escucha cambios del sistema y respeta movimiento reducido. Se conserva.
- `ui` ya reexporta varios componentes de `ui-v2`; se puede mejorar la base sin mantener dos implementaciones equivalentes de botones y campos.
- La publicación tiene tres pasos, revisión previa, errores por campo, pie de acciones y protección al salir. Se conserva la secuencia funcional.
- La búsqueda distingue destino deseado, paradas permitidas y bajada elegida. No debe perder esa precisión al reducir contenido.
- El seguimiento piloto ya utiliza mapa completo, panel expandible e insets para encuadrar la ruta. Se refina ese patrón.
- Existen reintentos, conservación de datos anteriores, confirmaciones de acciones críticas, pruebas de flujos y controles accesibles. Se mantienen al cambiar la presentación.

## 3. Dirección visual propuesta

Una interfaz tranquila y orientada a tareas: títulos legibles, datos importantes reconocibles y acciones situadas donde se necesitan. La identidad de KROW vive en el logotipo, el azul de acción, la ruta y el tono del contenido.

De Uber Driver se adoptan la claridad de las listas, la separación mediante espacio, la jerarquía de cifras y los controles sobre el mapa. KROW conserva su modelo de viajes compartidos y programados: no se incorporan estados de disponibilidad, conexión, demanda, incentivos ni una billetera ajenos al producto.

De Apple se adoptan jerarquía, adaptación a texto ampliado, áreas seguras y comprobación en ambas apariencias. La paleta negra y gris propuesta responde a la petición de KROW; no se presenta como una obligación de Apple. En React Native se mantienen fuentes y selectores nativos de cada plataforma y la iconografía MaterialIcons ya instalada.

### Reglas de composición

1. El espacio, la alineación y la tipografía forman las secciones. Una sección no necesita una caja por defecto.
2. Las entidades repetidas se presentan como filas. El separador se alinea con el texto; no se dibuja una cuadrícula de bordes.
3. Las tarjetas se reservan para contenido independiente que lo justifique, como un próximo viaje destacado o una confirmación acotada. No se fija una cuota arbitraria de tarjetas por pantalla.
4. Las hojas inferiores sí tienen superficie opaca y radio superior: separan una tarea del mapa o del contexto anterior.
5. Hay una acción dominante por tarea. En listas con acciones repetidas, estas usan énfasis local y no compiten con el avance general.
6. Las acciones destructivas siguen visibles y conservan su confirmación. El rojo se utiliza cuando ayuda a reconocer la consecuencia, sin llenar toda la pantalla de botones rojos.
7. Ningún dato operativo depende solo de color, gesto, posición en el mapa o un icono sin etiqueta.

### Tokens iniciales para validar

Son decisiones de diseño propuestas, todavía no valores implementados. Deben comprobarse en los emparejamientos reales de texto, iconos y controles.

| Token semántico | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `#0A0A0A` | Lienzo principal |
| `surface` | `#F4F4F5` | `#1C1C1E` | Campo, agrupación funcional o burbuja recibida |
| `surfaceRaised` | `#FFFFFF` | `#2C2C2E` | Hoja, modal y control flotante |
| `separator` | `#E5E5E7` | `#333336` | División discreta, no identificación exclusiva de un control |
| `textPrimary` | `#171719` | `#F5F5F7` | Títulos y contenido principal |
| `textSecondary` | `#626269` | `#A6A6AE` | Información complementaria legible |
| `primary` | `#174F9C` | `#7DAEFF` | Marca, acción dominante y selección |
| `onPrimary` | `#FFFFFF` | `#0A0A0A` | Contenido sobre la acción primaria |
| `primaryPressed` | `#103E7D` | `#9BC1FF` | Respuesta al pulsar |

Conservar nombres existentes donde sea semánticamente correcto. Añadir únicamente los roles que faltan, por ejemplo `onPrimary`, `onDestructive` o borde de control. Hoy `textInverse` se utiliza para varios fondos que no son equivalentes; no debe resolver por sí solo todas las combinaciones. Los colores de error, advertencia y éxito requieren pares de fondo/texto propios por tema. El separador tenue no se reutilizará como único indicador de foco o de un campo.

Comprobación matemática inicial de contraste sRGB: texto principal/fondo 17.90:1 en claro y 18.18:1 en oscuro; texto secundario/fondo 6.05:1 y 8.19:1; texto secundario/superficie clara 5.51:1 y sobre superficie elevada oscura 5.77:1; contenido del botón primario/fondo primario 7.97:1 y 8.83:1. Estos pares superan 4.5:1. Quedan por comprobar los demás estados, las opacidades, las imágenes y los mapas en su composición final.

| Sistema | Propuesta |
| --- | --- |
| Tipografía | Fuente del sistema: SF del dispositivo Apple y fuente nativa Android. No empaquetar SF para Android. |
| Título principal | 32/38, peso 700; permite varias líneas cuando es necesario. |
| Título de flujo | 24/30, peso 600. |
| Título de sección | 20/26, peso 600. |
| Texto principal | 17/24; dato de fila 16/22. |
| Texto secundario | 14/20; 12 solo para anotaciones no esenciales, nunca para instrucciones o importes. |
| Dato destacado | 32/38 o 36/42, cifras tabulares cuando deban alinearse. |
| Espaciado | Base de 4; escala 4, 8, 12, 16, 20, 24, 32, 48. Ampliar los tokens existentes, no añadir números aislados por pantalla. |
| Márgenes | 20 en teléfono como punto de partida; 16 en ancho compacto y adaptación por espacio disponible. |
| Ritmo | 8 entre etiqueta y valor relacionado; 16–20 entre filas; 24–32 entre secciones. |
| Radios | 12 para controles; 16 para superficies independientes; 24 en parte superior de hojas; circular solo cuando la forma lo requiere. |
| Botones | Altura mínima 48; principal 52 si necesita mayor presencia; altura flexible al ampliar texto. Sin brillo ni degradado. |
| Iconos | MaterialIcons, normalmente 22–24; mismo vocabulario de acciones, mismos tamaños por función. Área pulsable mínima 48 aunque el dibujo sea menor. |
| Elevación | 0 para contenido y listas; sombra tenue solo para controles sobre mapa y hojas cuando aporte separación. Evitar sombras múltiples. |
| Movimiento | Respuesta de pulsación discreta y transiciones breves; respetar la preferencia existente de movimiento reducido. No animar por adorno cada fila. |

## 4. Propuesta por pantalla y flujo

La matriz incluye todos los archivos de pantalla con contenido. Los estados y las alternativas por flags forman parte de cada entrega, no de una fase opcional posterior.

| Pantalla / archivo | Problema o riesgo observado en la composición | Rediseño concreto |
| --- | --- | --- |
| Login | Cabecera de al menos 210, logotipo de 150, selector elevado y formulario completo con vidrio, borde y sombra. | Logotipo compacto, título alineado con formulario abierto y selector Pasajero/Conductor discreto. Campos con fondo neutro, recuperación como enlace y «Iniciar sesión» dominante. Conservar requisitos distintos del acceso de conductor. |
| Register | Ocho campos, iconos repetidos, etiquetas que duplican placeholders y título centrado separado del resto del flujo. | Encabezado consistente; agrupar datos personales, académicos y acceso mediante espacio. Etiquetas estables y ayudas breves; validación junto al campo y resumen si falla el envío. Mantener todos los datos y validaciones. |
| Recover | Reenviar confirmación tiene casi el mismo peso que recuperar contraseña. | Formulario abierto, acción principal y reenvío como acción secundaria. Diferenciar error y correo solicitado sin revelar elegibilidad de cuentas. |
| PasswordReset | Variante de formulario con scroll pero sin `KeyboardAvoidingView` propio. | Reutilizar patrón de autenticación y comprobar teclado. Acción Guardar dominante y Cancelar con menor énfasis, conservando el cierre de sesión actual. |
| Splash | Pantalla registrada aunque el acceso comienza en Login; fondo azul, logo fijo de 400, animación y temporizador de 2.5 segundos. | Marca adaptada al ancho sobre superficie neutra y respeto a movimiento reducido; mantenerla fuera del acceso inicial actual. Revisar el temporizador como parte de su presentación si vuelve a utilizarse. |
| Home | Tarjeta de viaje activo, tarjeta de búsqueda/publicación, tarjeta de solicitudes y tarjetas por viaje reciente. Hay acciones repetidas y pulsables anidados. | Encabezado breve, una acción de buscar/publicar visible, próximo viaje destacado cuando exista y solicitudes como fila accionable con conteo. Últimos viajes en lista abierta. El viaje en curso debe poder retomarse de inmediato. |
| ActivityScreen | Tres botones independientes como filtro y una tarjeta grande por registro. | Control segmentado Próximos/En curso/Historial; filas con salida, destino, importe y estado. Mantener paginación y refresco. La fila completa abre detalle sin botón duplicado. |
| DriverTripsScreen | Duplica el patrón de actividad, con otra terminología («Activos»), tarjeta pulsable más botones Ver/Editar. | Mismo patrón de lista y nombres de estados. Editar como acción secundaria independiente; bloqueo explicado junto a ella. Conservar la ruta existente y la regla de edición. |
| FavoriteRoutesScreen | Tres botones apilados por tarjeta hacen que cada plantilla consuma mucha altura. | Lista con nombre, avenida y paradas; «Usar ruta» de énfasis local y Editar/Eliminar secundarios visibles en el detalle o menú explícito. Mantener aviso y revalidación de paradas inactivas. Unificar el texto «Rutas frecuentes». |
| PublishRideScreen | Paso de ruta extenso; tarjeta por parada; fecha, vehículo, cupo y aportación en múltiples superficies. Pie con vidrio. | Conservar Ruta → Detalles → Revisión. Origen ITNL informativo; destino editable; avenidas como radios; mapa y lista numerada de paradas sin cajas individuales. Paso 2 con secciones abiertas y selectores nativos. Revisión como resumen de datos con posibilidad de regresar. Pie opaco y una acción de avance. |
| RequestRideScreen | La búsqueda está dentro de Surface; el resumen de búsqueda pasa a otra tarjeta; cada resultado tiene subpaneles de ruta y coincidencia. | Origen fijo y destino como composición abierta. Resultados con salida e importe dominantes, conductor, bajada recomendada y distancia aproximada. Ruta completa y datos secundarios permanecen accesibles en detalle. |
| Detalle dentro de RequestRideScreen | Mapa, bloque de ruta, listado de atributos y opciones de bajada con borde; confirmar está al final del scroll. | Hoja con mapa útil, salida/precio/cupo, resumen de subida y bajada y lista de radios sin cajas. Pie persistente con resumen de bajada seleccionada y «Solicitar unirse». Mantener todas las bajadas habilitadas y distinguir solicitud de confirmación. |
| ScheduledScreen piloto | Resumen en tarjeta, progreso en tarjeta y tarjeta por pasajero con varios botones completos. No hay mapa en esta pantalla. | Cabecera con salida, ruta y estado; encuentro y descenso en recorrido vertical; conductor/vehículo en bloque abierto; pasajeros agrupados por parada. Aceptar/Rechazar locales, comenzar en zona de acción. Una vista previa de mapa solo si los datos ya disponibles permiten mostrar la ruta con honestidad, sin nuevas dependencias de backend. |
| TrackingScreen piloto | Mapa completo bien planteado, pero el panel repite próxima parada y agrega tarjetas internas. El botón de expansión ocupa una fila de acción de alto peso. | Conservar mapa completo y panel expandible. Resumen único de siguiente parada, nombres de subida/bajada y ETA vigente. Pasajeros en filas; acciones contextuales agrupadas. Expansión mediante encabezado accesible de bajo énfasis. No cambiar umbrales GPS, proximidad ni confirmaciones. |
| RuntimeRideScreen | Mapa al 42% dentro de márgenes, material de vidrio repetido, botones secuenciales y estados crudos como `b.status`. | Adoptar el mismo patrón de mapa/panel del piloto a nivel visual. Preparación offline en bloque compacto, próxima acción visible y pendientes/conflictos separados de información rutinaria. Traducir estados en presentación. Conservar comando, cola offline, respaldo, reanudación y bloqueo por movimiento. |
| RuntimeEntry | Carga/error básico fuera del patrón de pantalla en la rama que espera runtime. | Mismos estados de página, área segura, tema y retorno que en el resto de la aplicación. Conservar selección de runtime y fallback. |
| RideScheduledScreen compatibilidad | Paleta estática, encabezados locales, tarjetas por ruta, conductor, estado y reserva; componentes repetidos. | Consumir el tema y patrones de resumen, participante y lista de solicitudes. Mantener todos los estados y acciones existentes. No apagar esta alternativa por motivos visuales. |
| DriverActiveRideScreen compatibilidad | Mapa fijo de 220 dentro de formulario vertical y tarjeta por pasajero; paleta clara estática. | Tema reactivo, ruta con mayor espacio cuando sea viable y pasajeros en filas con confirmación local. Mantener las reglas de finalización existentes. |
| PassengerActiveRideScreen compatibilidad | Mapa fijo de 220, bloque de conductor duplicado y otra caja para estado. | Mismo lenguaje de seguimiento, encuentro/descenso reconocibles, conductor/vehículo compactos y estado con explicación en contenido abierto. Mantener cancelación y redirecciones actuales. |
| HistoryScreen | Resumen y cada reserva en tarjetas; cobro, reseña y conversación tienen énfasis muy parecido. | Pantalla tipo recibo: estado final, recorrido/fecha, importe y efectivo. Reservas del conductor como filas con expansión explícita. Reseña opcional y conversación secundarias. Conservar confirmación de efectivo y todos los estados terminales. |
| DriverFinishedRideScreen antiguo | Datos de ejemplo (Ana/Luis, 45 minutos), azul dominante y componentes de reseña locales. | No usar como referencia funcional. El navegador actual envía `DriverFinishedRide` a HistoryScreen. Mantener fuera del flujo; no borrar archivos ni conectar datos ficticios durante el rediseño. |
| PassengerFinishedRideScreen antiguo | Nombre/vehículo de ejemplo y fondo azul dominante. | Igual que el anterior: el destino registrado usa HistoryScreen. No reactivar esta maqueta. Cualquier limpieza posterior requiere una tarea separada de mantenimiento. |
| ChatScreen piloto | Cada mensaje es Card con material genérico; composer con Input y botón completo debajo. El color de un mensaje se aplica al wrapper exterior de una superficie que pinta su propio interior. | Burbujas simples y opacas diferenciadas por emisor, hora discreta, sin sombra. Composer junto a Enviar, refluye si falta ancho; mantiene reintento y borrador pendiente. Estado de solo lectura claro. |
| ProfileScreen | Cajas para identidad, rol, apariencia, avisos y ayuda; apariencia como tres botones completos; acciones destructivas de gran presencia. | Identidad abierta con avatar, nombre y estado. Secciones de filas con valor actual y chevron; apariencia con radio/check. Edición como modo de formulario existente. Conservar cambio de rol, notificaciones, privacidad, diagnóstico, soporte y cierre según flags. |
| DriverMetricsScreen | Siete tarjetas iguales hacen que cifras y contexto tengan la misma jerarquía. | Efectivo registrado destacado con periodo; comprometido y pendiente con etiquetas inequívocas; viajes/pasajeros/calificación en filas o columnas abiertas. No llamarlo saldo retirable ni añadir retiros o billetera. |
| ReportIncidentScreen | Cuatro botones completos compiten como selector; formulario sin manejo específico de teclado. | Tipos de problema como radios, descripción amplia, una acción de enviar y confirmación clara. Comprobar teclado, conservar idempotencia y no añadir servicios de emergencia inexistentes. |

Los componentes y subestados que no son pantallas separadas también se incluyen: `RideCard`, `RideOriginSummary`, `RideDateTimePicker`, `VehiclePicker`, `RideComfortControls`, `SeatDial`, `ValueSlider`, `PassengerStopCard`, `ReservationProgress`, `RecentRidesTable`, `PlacePicker`, autocompletado, modales, selectores, avatar, insignias y estrellas. `JourneyIllustration` y `MapPlaceholder` se revisan como recursos visuales sin consumidores encontrados en las pantallas actuales. El segundo utiliza una imagen remota estática: no se reutilizará como sustituto de un mapa real. `RecentRidesTable` y `DropdownInput` también permanecen fuera de los consumidores actuales encontrados; se distinguen de problemas visibles hoy.

### Publicación: simplificar sin recortar capacidades

- Mantener los tres pasos y sus datos. La mejora reduce peso visual y repetición, no validaciones.
- En cupo, presentar primero la cantidad y opciones directas o incremento/decremento. El gesto del dial, si se conserva, debe ser secundario y tener alternativa accesible; no debe ser necesario aprenderlo.
- En aportación, un monto editable y controles directos deben tener prioridad. Se conserva el slider y los accesos rápidos con menor énfasis para que ninguna capacidad actual se pierda.
- Vehículo seleccionado en una fila de resumen; lista de selección cuando haya más opciones. Mantener capacidad menos conductor y bloqueo por falta de vehículo.
- No convertir rutas frecuentes en borradores persistentes. Conservar la revalidación y la revisión antes de publicar.

### Búsqueda y reserva: información en el momento correcto

- Mantener visibles el origen ITNL y el destino deseado; no ofrecer un selector de origen que el piloto no permite.
- En resultados, priorizar salida, precio, cupo y conveniencia de la bajada. Reducir repetición de direcciones, sin ocultar datos necesarios para elegir.
- En detalle, mostrar claramente destino deseado, destino del conductor y bajada elegida como conceptos distintos.
- Las distancias actuales son aproximadas en línea recta: no llamarlas tiempo andando ni ruta peatonal.
- No prometer una reserva confirmada al pulsar solicitar. La aceptación del conductor conserva su lugar en el flujo.

## 5. Navegación y arquitectura visual

Conservar Inicio / Viajes / Perfil en el piloto. Las acciones principales se sitúan en Inicio; no añadir pestañas de ganancias, mensajes o descubrir tomadas de Uber. El chat sigue ligado a una reserva y las métricas siguen en el contexto de conductor.

Las pantallas raíz usan título grande; los detalles, formularios y chat usan encabezado compacto con retorno consistente. Los flujos de buscar/publicar y viaje activo pueden mantener su presentación de stack sin barra inferior para dar espacio a la tarea. No se alteran parámetros de navegación, enlaces profundos ni destinos de notificaciones.

La entrada Profile existe como pestaña y como ruta de stack. El botón Volver se decide por el contexto de presentación real, no únicamente por un flag global. `DriverTrips` y Activity deben compartir patrón visual aunque conserven sus rutas y hooks. Mantener los fallbacks y rutas de compatibilidad; no intentar unificar motores o lógica de negocio en esta entrega.

### Evolución del sistema reutilizable

1. Extender `shared/theme` y corregir materiales/variantes de `ui-v2`. Mantener `ThemeProvider` y los adaptadores `ui` existentes.
2. Mejorar `Text`, `ScreenHeader`, `Button`, `IconButton`, `Input`, `Divider`, `StatusBadge`, `FeedbackState` y `AnimatedModal`. Cambiar los defaults con una auditoría de sus consumidores.
3. Añadir solo patrones repetidos que hoy faltan: una fila reutilizable con título/detalle/acción, agrupación de sección y selector segmentado. No convertir cada bloque de pantalla en un componente genérico.
4. Compartir resumen visual de ruta y participante donde ya existe duplicación real. Esos componentes reciben datos y callbacks; no consultan APIs ni deciden permisos o estados de negocio.
5. Ajustar `RideCard` y `PassengerStopCard` conservando sus nombres públicos si ayuda a evitar cambios de imports; un nombre legado no obliga a dibujar una caja.
6. Unificar estrellas y selectores mediante adaptadores donde sea seguro. Los archivos antiguos no registrados no se eliminan como parte del trabajo visual.
7. No introducir una librería de diseño, iconos, animación o bottom sheet sin una necesidad demostrada. Las capacidades actuales bastan para esta propuesta.

El mapa activo seguirá usando sus motores actuales. Cualquier ajuste de cámara conserva los insets, identificación de la ruta, recuperación de errores y protección frente a coordenadas inválidas. No se cambiará la geometría persistida ni el comportamiento de actualización para conseguir una composición determinada.

## 6. Estados, accesibilidad y adaptación

| Situación | Comportamiento visual propuesto | Garantía que se conserva |
| --- | --- | --- |
| Carga inicial | Esqueleto que refleje filas/títulos reales; tamaño estable | No mostrar datos inventados |
| Actualización | Mantener contenido y estado de refresco discreto | No sustituir una pantalla útil por un vacío |
| Sin resultados | Explicación y acción pertinente, como cambiar destino | No fabricar rutas ni paradas |
| Catálogo no disponible | Motivo y actualizar/volver | No permitir publicar datos inválidos |
| Error de campo | Mensaje junto al control, foco claro | Misma validación actual |
| Error de sección | Mensaje compacto y reintento local | Mantener los demás datos visibles |
| Error bloqueante | Estado completo con retorno y reintento | No dejar al usuario encerrado |
| GPS antiguo | Última actualización visible y ETA retirada según reglas actuales | No simular seguimiento en vivo |
| Acción offline | Pendiente de confirmación y conflicto distinguibles | No confundir éxito local con confirmación del servidor |
| Éxito | Confirmación breve junto a la tarea o pantalla de resultado | No adelantar estado confirmado |
| Cancelación/rechazo/cierre | Acción clara y confirmación nativa existente | Mismos efectos y permisos |
| Chat solo lectura | Mensaje explicativo en lugar de composer activo | Mantener autorización para escribir |

Requisitos de aceptación de accesibilidad:

- Objetivos táctiles de al menos 48 unidades lógicas sin solapamientos. Los iconos pueden medir menos.
- Texto escalable y pruebas hasta 200%; permitir crecer a botones, filas y títulos. No imponer `allowFontScaling={false}` para resolver un recorte.
- Verificar contraste de texto normal mínimo 4.5:1 y de controles/indicadores relevantes 3:1; comprobar además pares de estado, foco y selección. Buscar mayor contraste en texto pequeño. Las separaciones puramente decorativas pueden ser tenues.
- VoiceOver y TalkBack: orden de lectura, nombre/rol/estado de controles, radios y casillas, cabeceras, modal con foco y retorno de foco al cerrar.
- No hacer toda una tarjeta accesible como un único botón cuando contiene otros botones. Las acciones independientes conservan su foco.
- Usar movimiento reducido existente; verificar que no quede una animación de entrada o pulsación fuera de esa preferencia.
- Revisar 320, 360, 390 y 430 de ancho lógico; contenido largo, nombre de carrera y direcciones reales; teclado abierto y área segura con notch y navegación gestual.
- Revisar padding inferior de pestañas, stack y hojas para evitar tanto contenido tapado como doble espacio seguro.
- En seguimiento, el panel compacto debe dejar leer el recorrido; al ampliar texto puede crecer o desplazarse el contenido. No fijar un porcentaje de mapa a costa de ocultar acciones necesarias.

## 7. Plan de implementación por entregas

| Orden | Entrega | Archivos y familias principales | Criterio para darla por terminada |
| --- | --- | --- | --- |
| 0 | Línea base y cobertura | Navegadores, pantallas por flags, documentación y pruebas existentes | Inventario contrastado con capturas de dispositivo; registrar cambios locales previos. Sin activar flags ni crear operaciones reales para obtener capturas. |
| 1 | Fundamentos | `shared/theme`, materiales, `ui-v2`, adaptadores `ui` | Claro/oscuro neutros, variantes semánticas, contraste medido, controles/estados de muestra y sin decoraciones heredadas accidentales. |
| 2 | Navegación y uso frecuente | MainTabs, Home, Activity, DriverTrips, Profile y métricas | Jerarquía y listas consistentes; buscar/publicar/retomar viaje accesibles; rutas y acciones existentes conservadas. |
| 3 | Publicación y reserva | PublishRide, RequestRide, favoritas, RideCard, mapas y selectores | Los recorridos completos conservan datos, orden, errores, capacidad, selección de parada, revisión y confirmación. Pie de acción y teclado funcionan en ambos temas. |
| 4 | Operación del viaje | Scheduled, Tracking, RuntimeEntry, RuntimeRide y compatibilidad | Mismo lenguaje visual por rol y variante; mapa útil; sin cambios en GPS, offline, comandos, reservas o estados. |
| 5 | Acceso y cierre de experiencia | Login, Register, Recover, PasswordReset, Chat, History, ReportIncident y modales | Sin pantallas con presentación anterior dentro de los flujos alcanzables. Se mantienen reintentos, permisos, cobros, reseñas y solo lectura. |
| 6 | Validación transversal | Matriz completa Android/iOS × claro/oscuro | Capturas, accesibilidad, regresiones y comprobación del flujo completo. Registrar pendientes externos sin llamarlos aprobados. |

Las entregas se revisan progresivamente con la misma especificación, sin mezclar cambios visuales con refactorizaciones de API o dominio. Cada entrega contiene sus estados vacíos, de error y de carga. La fase final comprueba la consistencia entre ellas; no debe descubrir por primera vez las ramas de compatibilidad.

### Validación prevista

- Ejecutar TypeScript y lint sobre los cambios; ejecutar las suites existentes relevantes: tema/elevación/pulsación, publicación, búsqueda/reserva, selector de lugar/teclado, mapas, piloto/chat y runtime/offline según la entrega.
- Añadir pruebas solo cuando cambie un comportamiento de presentación con riesgo real: foco/teclado, selección accesible, límites de interacción o conservación de acciones. No crear tests que solo reproduzcan estilos.
- Revisar en Android e iOS: autenticación, conductor aprobado/no aprobado, sin vehículo, catálogo vacío, publicación nueva/edición/favorita, búsqueda vacía/con resultados, todas las bajadas, reserva pendiente/confirmada/rechazada/cancelada, viaje programado/en curso/finalizado, efectivo y reseña, chat con/sin escritura, apariencia y rol.
- Para variantes habilitadas en su entorno de prueba, comprobar runtime: preparación offline, desconexión, pendientes, conflicto, reanudación y estados terminales. No habilitarlas en el entorno del usuario solo para la auditoría.
- Capturar matriz de estados por plataforma y tema; comparar espaciado, tipografía, lectura y visibilidad de acciones. Mantener trazabilidad de estados no accesibles sin datos o permisos.
- En release, comprobar desplazamiento de listas, apertura de hojas, teclado y mapa sin degradación frente a la línea base. Cambios de renderizado se justifican por medición, no por una promesa abstracta de rendimiento.

### Límites de la entrega visual

No se modifican API, backend, autenticación, permisos, catálogo, matching, geometrías, capacidad, estados de reserva/viaje, efectivo, sincronización, flags o reglas de autorización. No se elimina funcionalidad para reducir densidad. La implementación de una foto subida desde el dispositivo, una billetera, retiros, nuevos canales de soporte o navegación adicional no forma parte de esta propuesta.

La interfaz de foto conserva la capacidad existente de URL HTTPS, presentada como opción avanzada con ayuda clara. Los enlaces de soporte/privacidad y las capacidades desactivadas deben mostrar un estado honesto; el rediseño no puede convertir una configuración pendiente en una función disponible.

## 8. Fuentes y criterio de diseño

- Capturas de Uber Driver proporcionadas por el usuario: jerarquía, listas, acciones y relación mapa/panel; no se extraen requisitos funcionales de ellas.
- [Apple HIG · Layout](https://developer.apple.com/design/human-interface-guidelines/layout): adaptación a tamaño, áreas seguras y texto ampliado.
- [Apple HIG · Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): legibilidad, adaptación y uso de tecnologías de asistencia.
- [Apple HIG · Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode): comprobar contraste y contenido en ambas apariencias.
- [Apple · UI Design Dos and Don’ts](https://developer.apple.com/design/tips/): legibilidad y áreas táctiles.

Las cifras de tipografía, espaciado, radios y paleta de este documento son decisiones propuestas para KROW. Las fuentes informan los principios, no certifican estos valores ni sustituyen las pruebas de React Native en ambas plataformas.
