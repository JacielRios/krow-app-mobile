# KROW · Fluidez, microinteracciones y refinamiento de la experiencia

20 de octubre de 2026 · Investigación y propuesta técnica. Complementa [la auditoría visual](ui-ux-audit-20261020.md). No se modificó código de la aplicación ni se instalaron dependencias, skills o herramientas.

## 1. Recomendación

La primera entrega debe realizarse con las herramientas instaladas. Los beneficios más claros están en corregir las salidas de modales, dar continuidad al panel del mapa, conservar posición y contenido durante actualizaciones, mejorar teclado/foco y reducir las actualizaciones de React durante los gestos.

Mantener React Native 0.84.1, Reanimated 4.6.0, Worklets 0.12.2 y la navegación actual. No actualizar a `latest` para ejecutar este rediseño. Evaluar Gesture Handler y Bottom Sheet en una prueba posterior y acotada al panel persistente del viaje. La háptica es un refinamiento opcional posterior; Moti y Skia no aportan una necesidad suficiente a los flujos actuales.

Se conserva la dirección visual aprobada: superficies neutras, oscuro negro/gris, azul moderado, listas abiertas y jerarquía clara. La calidad debe percibirse en la respuesta y continuidad de las tareas, sin reconstruir la interfaz alrededor de efectos.

## 2. Evidencia y límites

Se contrastó la auditoría de las 24 pantallas con sus mecanismos de interacción: navegadores, botones, alertas, hojas, carga, formularios, listas, chat, mapas, seguimiento piloto y runtime. Se consultaron documentación oficial, manifiestos de skills y metadatos del registro npm. Las versiones instaladas se comprobaron con `npm ls --depth=0`, `node_modules`, lockfile y configuración nativa.

- **Observado en código:** rutas de render, temporizadores, animaciones, control de gestos, callbacks y versiones.
- **Confirmado documentalmente:** rangos soportados y requisitos declarados de bibliotecas. Esto no certifica una integración nativa no compilada.
- **Estimado:** impacto relativo en CPU, GPU, memoria, tamaño y mantenimiento. No se han medido esos costes en dispositivo durante esta investigación.
- **Pendiente:** FPS, tiempos de frame, memoria, CPU y respuesta táctil en Android físico e iOS. No hay una certificación de 60 FPS basada en esta lectura.

La evidencia de versiones está guardada en [premium-library-research-20261020.json](premium-library-research-20261020.json). Contiene metadatos públicos, no paquetes instalados. El tamaño descomprimido de npm incluido en esa evidencia no equivale al incremento de tamaño del APK/IPA.

## 3. Base técnica real

| Área | Estado comprobado | Implicación |
| --- | --- | --- |
| Aplicación | React Native 0.84.1, React 19.2.3, proyecto nativo con carpetas Android/iOS; sin Expo instalado | Evitar introducir Expo Modules solo para un efecto aislado. |
| Arquitectura Android | `newArchEnabled=true`, `hermesEnabled=true`; mínimo API 24, compile/target 36, Kotlin 2.1.20 | Reanimated 4 encaja con la arquitectura. Verificar futuras dependencias con Fabric y la configuración nativa real. |
| iOS | Podfile nativo, mínimo iOS 15.1; configuración de Google Maps y Mapbox existente | No migrar navegación o mapas para conseguir una animación. La validación nativa requiere Xcode y dispositivo/simulador. |
| Animación | Reanimated 4.6.0 + Worklets 0.12.2; plugin `react-native-worklets/plugin` al final de Babel | Ya existe infraestructura para trabajo visual en UI thread. No hace falta duplicar plugins. |
| Navegación | Native 7.5.0, Native Stack 7.14.5, Bottom Tabs 7.20.0, Screens 4.24.0, Safe Area 5.7.0 | Mantener native stack y contratos actuales. Ajustar presentación y continuidad por flujo. |
| Pulsación | `AnimatedPressable` usa Animated de RN, `useNativeDriver: true`, escala 0.98 y movimiento reducido | Ya ejecuta la animación soportada mediante el driver nativo. Cambiarlo a Reanimated por sistema no ofrece un beneficio demostrado. |
| Gestos | Slider y dial usan `PanResponder`; no hay Gesture Handler | La primera mejora es reducir llamadas repetidas al padre y separar el estado visual del dato confirmado. |
| Hojas | `AnimatedModal` usa `Modal` con slide, backdrop dentro y `KeyboardAvoidingView` | No es un bottom sheet arrastrable. Fondo y contenido comparten la presentación del modal. |
| Panel de seguimiento | `TrackingScreen` cambia altura entre aproximadamente 38% y 68%, con límites; sin interpolación | El cambio de layout es inmediato. Es una oportunidad de continuidad espacial concreta. |
| Datos y navegación | Polling y sockets por flujo; varias ramas ya se condicionan a foco o estado de app | Conservar frecuencia, respaldo y reglas; optimizar presentación sin suspender el seguimiento necesario. |

Los metadatos consultados muestran versiones publicadas más recientes de navegación: Native 7.5.1, Native Stack 7.21.0, Bottom Tabs 7.21.0 y Screens 4.30.0. No hay una razón demostrada en esta revisión para actualizar el conjunto como requisito del trabajo visual. Cualquier actualización debe tener alcance propio y validación coordinada; un peer dependency amplio no demuestra ausencia de regresiones.

## 4. Librerías: decisión y compatibilidad

| Biblioteca | Instalada / versión consultada | Compatibilidad y mantenimiento comprobados | Decisión para KROW | Coste relativo |
| --- | --- | --- | --- | --- |
| Reanimated | Instalada 4.6.0; `latest` 4.7.1, publicado 2 oct 2026 | La tabla y el paquete local admiten RN 0.84 con 4.6.x y Worklets 0.12.x. El `latest` exige RN 0.86–0.88 y Worklets 0.13.x. | Mantener 4.6.0; utilizarlo en paneles y transiciones de estado justificadas. | Sin nueva dependencia. Worklets y animaciones siguen consumiendo UI thread/CPU/GPU; no son gratuitas. |
| Worklets | Instalada 0.12.2; `latest` 0.13.0, 18 sep 2026 | La versión instalada admite RN 0.83–0.87; 0.13.0 exige 0.86–0.88. | Conservar la pareja instalada. En nuevo trabajo, programar llamadas al runtime de RN solo en cambios discretos. | Evitar capturar objetos de pantalla o snapshots completos en closures de worklets. |
| Gesture Handler | Ausente; `latest` 3.4.0 y canal legacy 2.33.1, publicados 16 oct 2026 | La tabla 3.x excluye RN 0.84 en 3.4.x; 3.3.x sí lo incluye. La documentación 2.x declara RN 0.79+ desde 2.28. La configuración nativa de 2.33.1 no eleva el mínimo de KROW. | Solo para la prueba de gestos. Candidato conservador con Bottom Sheet: **2.33.1 exacta**, todavía sin certificación de build/gestos. No instalar `latest`. | Dependencia nativa, root view y composición de gestos; requiere recompilar y pods. Riesgo real de competir con mapa, scroll y teclado. |
| Bottom Sheet | Ausente; 5.2.14, 9 may 2026 | Peers de la versión concreta aceptan Gesture Handler >=2.16.1 y Reanimated >=3.16 o >=4 prerelease. El sitio introductorio todavía menciona v1–3; se contrastó con el manifiesto publicado. | Candidato condicionado para panel persistente sobre mapa, si el arrastre demuestra valor. No sustituir todos los modales. | Añade portal y coordinación de scroll/teclado/gestos. Mayor coste de integración que animar el panel actual. |
| React Navigation / Screens | Ya instaladas; versiones en sección anterior | Native Stack utiliza contenedores nativos. Los tipos instalados incluyen `formSheet`, detents y grabber. | Conservar. Explorar `formSheet` cuando la hoja sea una pantalla independiente; no reemplaza directamente el panel persistente del mapa. | Cambiar un modal local a ruta exige gestionar foco, estado y callbacks; no es un reemplazo sin cambios de integración. |
| Expo Haptics | Ausente; 58.0.7, 16 oct 2026 | Expo documenta soporte Android/iOS y exige instalar Expo al incorporarlo a una app RN existente. | No introducir Expo exclusivamente para háptica. Sería razonable si la app ya utilizara Expo Modules compatibles. | Coste de integración de plataforma superior al beneficio acotado buscado aquí. |
| React Native Haptic Feedback | Ausente; 3.0.0, 29 mar 2026 | Declara RN >=0.71, iOS >=13 y Android >=23; se inspeccionaron podspec y Gradle publicados sin ejecutar scripts. Los mínimos encajan con KROW. | Alternativa preferible si se aprueba háptica discreta. Usar patrones estándar; requiere prueba nativa, no solo revisión de peers. | Un módulo nativo adicional; coste pequeño por evento discreto, integración y diferencias por hardware pendientes de medir. |
| Moti | Ausente; 0.30.0, 29 ene 2025 | Peer de Reanimated `*` y dependencia de Framer Motion 6.5.1. Ese comodín no certifica Reanimated 4.6 ni RN 0.84. No se infiere abandono solo por la fecha. | No incorporar: las necesidades actuales se resuelven con componentes y primitivas existentes. | Otra abstracción y dependencias; introduce más superficie de mantenimiento sin una reducción clara del trabajo. |
| Skia | Ausente; 2.14.0, 1 oct 2026 | Peers declarados aceptan React 19, RN >=0.78, Reanimated >=4 y Worklets >=0.7. Su grafo incluye motores nativos de dibujo. | No incorporar para mapas, botones, hojas o estados vacíos. Reconsiderar solo para una visualización concreta que las vistas nativas no resuelvan. | Mayor coste binario y de renderizado/integración que las alternativas de esta propuesta. No se atribuye un número de MB sin builds comparables. |

La compatibilidad de la pareja instalada se apoya en [la tabla de Software Mansion](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/). Las restricciones de Gesture Handler se comprobaron en [3.x](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/getting-started/) y [2.x](https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/installation/).

Para Bottom Sheet se revisó [el manifiesto de 5.2.14](https://github.com/gorhom/react-native-bottom-sheet/blob/v5.2.14/package.json). Su código utiliza la API `Gesture` de la generación 2. Las relaciones de gestos de la API nueva de Gesture Handler 3 no se pueden mezclar libremente con las anteriores: evitar una combinación de ejemplos de ambas generaciones aunque los peers acepten un rango amplio. Esto no demuestra que toda integración con 3.x falle; justifica una prueba acotada antes de adoptarla. [Guía oficial de migración](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/).

Para háptica: [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) y [React Native Haptic Feedback](https://github.com/mkuczera/react-native-haptic-feedback). Las versiones y fechas de todas las filas se contrastaron con los manifiestos y metadatos públicos guardados en el JSON adjunto.

## 5. Hallazgos de interacción y propuestas priorizadas

Cada fila identifica componente, problema, mejora, solución técnica, beneficio, coste estimado y prioridad. «Alta» no significa añadir más efectos: incluye conservar una solución existente que ya funciona.

### Prioridad alta

| ID · Pantalla/componente | Problema comprobado o riesgo identificado | Mejora recomendada y solución | Beneficio | Rendimiento / complejidad estimados |
| --- | --- | --- | --- | --- |
| A1 · `AnimatedPressable`, Button e IconButton | La animación ya es nativa; todos los consumidores heredan una misma escala, incluso filas extensas. | Conservar Animated nativo para pulsación simple. Escala mínima en botón compacto; resaltado de fondo/opacidad en fila. El feedback empieza en press-in y la acción mantiene su evento actual, sin esperar la animación. | Respuesta inmediata y coherente sin que la lista parezca encogerse. | Bajo; no migrar todo a Reanimated. Medir antes de cambiar una primitiva estable. |
| A2 · `CustomAlert` | Al pasar `visible` a falso se retorna `null`; los 150 ms programados de salida no pueden verse. La entrada combina fade del Modal con escala/opacidad propia desde escala inicial 0. | Separar estado montado/visible del estado de cierre, o usar una única presentación nativa. Si se conserva salida propia, mantener montaje hasta terminar, cancelar al reabrir/desmontar y evitar doble animación. Mantener callbacks y bloqueos de acciones. | Apertura y cierre previsibles; sin desaparición brusca ni zoom exagerado. | Bajo/medio; cuidado con cierres dobles y devolución de foco. Sin dependencia nueva. |
| A3 · `AnimatedModal`, PlacePicker y detalle de viaje | `Modal` con slide desplaza el conjunto que contiene también el backdrop. No existe arrastre ni presentación/retirada independientes. | Mantener un único mecanismo: Modal sin animación propia y hoja con translateY + backdrop con opacidad mediante Reanimated instalado, o presentación nativa cuando encaje. No combinar ambos. Cierre reversible, backdrop fijo y retorno de foco. | La hoja pertenece al contexto anterior; el fondo no parece desplazarse con ella. | Medio por ciclo de vida, teclado y a11y; animar dos capas, no la pantalla completa. |
| A4 · `TrackingScreen` | `setExpanded` cambia `height` inmediatamente. La próxima parada se repite en resumen y detalle. | Primero transición de panel con Reanimated, sin nuevo paquete: estructura de mapa estable, resumen único y shell desplazable. Mantener acción esencial en región visible y detalles fuera de foco cuando estén ocultos. Actualizar insets de cámara al asentarse, sin comandos por frame. | Se entiende la relación mapa/detalle y se conserva el contexto. | Medio. Preferir transform; si el contenido exige cambio de altura, medir esa alternativa explícitamente. No escalar texto ni remontar el mapa. |
| A5 · ValueSlider, SeatDial y publicación | `PanResponder` llama al padre durante el movimiento. `change()` en Publish también ejecuta `setDirty(true)` y crea un objeto nuevo de errores en cada callback, incluso al repetirse un valor. El dial impide ceder el gesto una vez capturado. | Eliminar notificaciones de valores discretos repetidos. Mantener respuesta visual inmediata; si hace falta, shared values para la parte continua y comunicación a RN por cambio de valor/fin, conservando el contrato del control y el valor antes de enviar. Revisar cancelación, scroll vertical y alternativas accesibles. | Arrastre más estable y menos trabajo de pantalla mientras se ajusta cupo/aportación. | Bajo para deduplicar; medio para cambiar motor de gesto. No se afirma una caída actual de FPS sin perfilado. |
| A6 · Formularios y chat | Manejo de teclado repartido; PasswordReset y ReportIncident no tienen un KeyboardAvoidingView propio. Modales ya suman su ajuste, insets y footer. | Unificar responsabilidades de teclado por contenedor; usar mecanismos RN/nativos existentes y probar foco, returnKey, scroll al error y composer. Evitar doble compensación. Los errores se ven junto al campo y se anuncian sin sacudirlo. | Campos y acción alcanzables; menos saltos de layout. | Bajo/medio. No añadir Keyboard Controller antes de demostrar una limitación reproducible. |
| A7 · Activity, DriverTrips, resultados e historial | Listas crecientes con `.map()` dentro de ScrollView; filas pueden contener otro botón que hace lo mismo. | Filas abiertas y una navegación inequívoca. Para listas largas, utilizar FlatList/SectionList existentes en RN conservando paginación, IDs, orden y acciones. Reservar animación de cambio a elementos concretos, no a cada remontaje. | Desplazamiento y retorno a la lista más previsibles. | Medio por reestructurar presentación. No usar `getItemLayout` con alturas variables, ni añadir FlashList automáticamente. |
| A8 · Actualización de Home/Viajes, búsqueda y seguimiento | Alternan cargas, feedback y datos de alturas distintas. Algunas ramas conservan datos; otras sustituyen la sección. | Conservar datos válidos de la misma consulta al refrescar; placeholder con dimensiones pertinentes al cargar por primera vez. Reservar lugar al feedback transitorio cuando proceda. Al cambiar filtro, no mostrar resultados del grupo anterior como si fueran del nuevo. | Menos parpadeo y lectura estable sin información engañosa. | Bajo/medio. Conservar claves, caché, polling y semántica de errores. |
| A9 · Mapa y panel, piloto/runtime | `useTracking` actualiza antigüedad cada segundo; el componente consumidor vuelve a renderizar y reconstruye parte de su presentación. Ya hay guardas para cámara y coordenadas. | Medir commits del mapa/markers al variar solo el reloj. Aislar la etiqueta de antigüedad o estabilizar props únicamente si se demuestra trabajo nativo innecesario. Respetar pan manual, seguimiento elegido y una sola orden de cámara por evento relevante. | Mapa estable mientras cambia texto operativo. | Medio. UI thread también ejecuta mapas: evitar varias animaciones de cámara/hoja simultáneas. No cambiar el intervalo GPS ni deducir un cuello de botella solo por un render. |
| A10 · Tema/movimiento y todas las entradas | ThemeProvider arranca `motionEnabled=true` y consulta Reduce Motion de forma asíncrona. Skeleton puede comenzar antes de resolverla; Splash no utiliza esa preferencia. | Mantener preferencia viva y garantizar que las entradas automáticas no arranquen hasta conocerla, o usar comportamiento inicial sin movimiento. Al reducir movimiento, selección y éxito siguen visibles por texto/estado. | Accesibilidad consistente desde el primer frame y durante cambios de configuración. | Bajo/medio. Cambiar presentación, sin retrasar recuperación de sesión ni tareas. |

### Prioridad media

| ID · Pantalla/componente | Problema u oportunidad | Mejora y solución técnica | Beneficio | Rendimiento / complejidad estimados |
| --- | --- | --- | --- | --- |
| M1 · Native stack, pestañas y retornos | Stack ya usa animación de plataforma; tabs usan fade; finales tienen fade explícito. | Conservar el stack nativo. Pestañas con cambio inmediato o fade muy breve según prueba; no usar deslizamiento jerárquico. Conservar posición de scroll y la instancia del mapa al volver. Probar reemplazos a historial, sin retrasar estados de viaje para terminar una transición. | Orientación y velocidad en acciones frecuentes. | Bajo. No reescribir navegación ni usar shared elements experimentales. |
| M2 · Login Pasajero/Conductor | Spring nativo ya existente; el ancho se calcula con `Dimensions.get` y una fórmula de márgenes. | Medir el selector con onLayout o dimensiones reactivas; resorte breve sin rebote perceptible y destino correcto con texto ampliado. Mantener selección visible incluso sin movimiento. | Control preciso en distintos tamaños. | Bajo; conservar motor actual y reglas distintas de acceso. |
| M3 · Publish, edición y favoritas | Cambios de paso sustituyen contenido y hacen scroll al inicio sin transición. | Actualizar paso/validación inmediatamente; una entrada opcional de opacidad de 120–160 ms sobre contenido del paso. No desplazar el formulario largo lateralmente ni animar un MapView que se está adjuntando. Revisión mantiene pie estable. | Señala avance sin alargar publicación. | Bajo/medio. Los datos y protección de salida permanecen en el padre. |
| M4 · Buscar → resultados y paradas | Cambio de etapa y selección afectan mucho contenido. | Resumen de destino estable; resultados aparecen una vez listos sin cascada. Selección de bajada cambia radio, énfasis y resumen en 100–160 ms; confirmación fija conserva importe y bajada. Marcador cambia estado sin pulso repetitivo ni cámara automática por cada render. | Se ve qué se eligió y qué se enviará. | Bajo/medio. Usar la fuente actual de selección; no crear un estado visual que pueda enviarse desincronizado. |
| M5 · Scheduled, aceptar/rechazar y progreso | Cambios de reserva reordenan o sustituyen contenido después de confirmar. | Tras respuesta confirmada, actualizar estado y opcionalmente reacomodar solo la fila afectada en 160–200 ms; conservar foco y contexto. Pendientes visibles durante envío; la animación no anticipa aceptación. | Resultado comprensible y confianza en la acción. | Medio por foco y altura variable; no animar todos los pasajeros al hacer polling. |
| M6 · Chat | Lista invertida, composer de tamaño variable, feedback general después de envío. | Mantener anclaje de conversación al aparecer teclado. Animar solo un mensaje nuevo relevante, con opacidad/traslación mínima; nunca mensajes históricos reciclados. Mantener reintento, clientId y solo lectura. | Conversación continua sin saltos ni duplicados aparentes. | Medio. No activar scroll automático si el usuario está leyendo mensajes anteriores. |
| M7 · History, efectivo y reseña | Confirmación compite con controles grandes; opcionalidad de reseña puede quedar diluida. | Estado final y efectivo legibles; check/confirmación breve después del éxito real. Estrellas cambian estado sin rebote, comentario opcional y envío conserva idempotencia. | Cierre claro de una operación. | Bajo. No animar cifras de dinero ni simular saldo/ingresos. |
| M8 · Profile, apariencia y edición | Cambio entre ficha y formulario puede cambiar altura; tema reemplaza toda la paleta. | Edición con layout preparado, foco al primer campo si corresponde y acciones estables. Cambio de tema directo; evitar crossfade de toda la app/mapas y reconstrucciones extra. | Sensación de ajuste nativo y estable. | Bajo. No introducir una transición global de ThemeProvider. |
| M9 · Skeleton y feedback | Skeleton pulsa indefinidamente hasta desmontarse; no recibe visibilidad/foco. Varias pantallas usan un bloque de carga genérico. | Usar skeleton solo cuando ayuda a anticipar estructura; spinner local en envío corto. Evitar destello de skeleton en caché rápida mediante una condición visual de umbral, sin retrasar red ni contenido. Pausar la animación si la vista no es visible; estático con Reduce Motion. | Menos ruido y consumo durante navegación. | Bajo. No cambiar políticas de consultas para justificar la animación. |
| M10 · Haptics en selección y éxito | No hay háptica actual. | Opcional: un toque ligero al confirmar una selección discreta y patrón de éxito tras publicar/confirmar efectivo. Proveedor único, ausencia de hardware como no-op y preferencias del sistema respetadas. Nunca en cada frame, GPS o actualización remota. | Refuerzo táctil de acciones propias. | Módulo nativo y pruebas físicas; beneficio secundario frente a teclado y paneles. |

### Prioridad baja o descartada por ahora

| Propuesta | Motivo | Alternativa |
| --- | --- | --- |
| Entradas escalonadas de todas las filas | Se repiten al navegar/reciclar y retrasan una tarea frecuente. `RecentRidesTable` ya tiene FadeInDown/LinearTransition pero no es el componente usado por Home actual. | No invertir en animar componentes sin consumidores; datos visibles de inmediato. |
| Shared elements o transformación de tarjeta a mapa | Mayor fragilidad con Fabric, capas nativas y estados; la propia documentación de Reanimated los identifica como experimentales. | Navegación nativa y hoja con continuidad espacial. |
| Skia, shaders, desenfoque animado y vidrio | No resuelven una necesidad concreta; aumentan renderizado e integración y contradicen la dirección sobria. | Superficies opacas, transform y opacidad en pocas capas. |
| Moti para uniformar todas las animaciones | Duplica una infraestructura suficiente. | Tokens y componentes existentes con una responsabilidad clara. |
| Haptics continuos, celebraciones, sonidos de confirmación | Fatiga y distracción; el viaje requiere atención al contexto. | Feedback visual suficiente y háptica discreta opcional. |
| Migrar a native tabs, Expo Router, nueva gestión de estado o React Compiler | Cambio arquitectónico sin un problema medido que lo justifique en este alcance. | Mantener React Navigation, React Query y patrones actuales. |
| Optimizar mediante flags experimentales de Fabric/Reanimated | Pueden afectar detección táctil, compilación y estabilidad. | Investigar solo ante una regresión medida y con prueba aislada; no activarlos por seguir una lista de consejos. |

## 6. Especificación inicial del movimiento

Son valores de partida propuestos para KROW, no duraciones obligatorias de Apple ni resultados de pruebas de FPS.

| Interacción | Tratamiento | Movimiento reducido |
| --- | --- | --- |
| Pulsación | Feedback inmediato; escala 0.98 en botón compacto o cambio de fondo en fila. Recuperación breve e interrumpible. | Resaltado estático, sin escala. |
| Selección de opción | Estado inmediatamente actualizado; color/opacidad 100–160 ms si ayuda. | Estado inmediato con check/radio y texto. |
| Cambio de paso o feedback local | Opacidad 120–180 ms; desplazamiento opcional de pocos puntos, nunca del formulario completo. | Inmediato o fade mínimo si no resulta molesto. |
| Hoja | Traslación y backdrop coordinados, aproximadamente 220–300 ms o spring equivalente sin oscilación visible. Un nuevo gesto interrumpe la animación. | Cambio de posición inmediato; conservar controles de expandir/cerrar. |
| Expansión de sección | Reacomodo 160–220 ms cuando facilita seguir contenido. Sin animar varias pantallas a la vez. | Layout inmediato y foco correcto. |
| Navegación | Predeterminada de native stack; no intentar forzar su duración universal. | Preferencia actual `none` conservada donde aplica. |
| Cámara | Mantener las protecciones actuales y el control explícito de seguir/centrar. La interpolación de vehículo no inventa trayecto ni mantiene movimiento con GPS obsoleto. | Recorte de movimiento según preferencia existente; ubicación real siempre distinguible. |

No esperar a un callback de animación para comenzar solicitudes, validar o navegar, salvo la limpieza visual imprescindible del cierre. No añadir demoras para que un efecto pueda apreciarse. Una animación en UI thread evita depender del hilo JS para cada frame, pero aún puede competir con el mapa por el presupuesto visual. [React Native 0.84: rendimiento](https://reactnative.dev/docs/0.84/performance).

## 7. Panel sobre mapas: prueba acotada antes de añadir paquetes

### Primera opción: herramientas actuales

- Mantener la misma instancia de RoutePreviewMap y su tamaño de lienzo completo.
- Construir el movimiento del shell del panel con Reanimated instalado; evitar relayout del mapa en cada frame.
- Mantener resumen y acción crítica visibles en modo compacto; detalles expandidos desplazables. Los elementos ocultos no deben recibir toques ni foco accesible.
- Ajustar el espacio visible de cámara al estado asentado del panel, no enviar fit/animateCamera por cada movimiento de dedo.
- No convertir la ruta en una imagen ni superponer dos mapas durante la transición.
- Conservar guards de coordenadas, attachment, recuperación, GPS antiguo y decisiones de seguimiento manual.

### Segunda opción: solo si arrastrar aporta una mejora comprobable

Probar Bottom Sheet 5.2.14 con Gesture Handler 2.33.1, fijadas para el experimento, conservando Reanimated/Worklets actuales. Es una combinación candidata por documentación y código, no una integración ya validada.

La prueba debe resolver scroll interno contra arrastre del panel, pan/pinch del mapa, pulsación de marcadores, botones, accesibilidad, teclado y Back Android. GestureHandlerRootView debe estar en el root y en el contenido del Modal Android cuando corresponda. Usar scrollables de la hoja y comprobar los conflictos descritos por su [documentación](https://gorhom.dev/react-native-bottom-sheet/troubleshooting).

`enableDynamicSizing` puede insertar otro snap point y alterar índices. Elegir detents identificables o fijar sizing para que «compacto/expandido» no dependan accidentalmente de un índice cambiante. Respetar Reduce Motion y no definir `overrideReduceMotion` para forzar movimiento. El usuario siempre conserva acciones explícitas de expandir/contraer y volver.

`formSheet` nativo puede ser útil para un detalle independiente y merece evaluación antes de añadir una librería en ese caso. Tiene diferencias de contención, interacción con el fondo y scroll entre plataformas. No se propone convertir todos los modales locales en nuevas rutas solo para aprovecharlo. [React Navigation Native Stack](https://reactnavigation.org/docs/native-stack-navigator/).

## 8. Skills y recursos disponibles

Se revisó primero el catálogo local y, para los candidatos relevantes, su alcance e instrucciones. No se instalaron ni activaron las instrucciones de recursos externos como reglas del proyecto.

| Skill disponible | Qué aporta a KROW | Uso recomendado / límite |
| --- | --- | --- |
| `computer-use:computer-use` | Inspección de app/emulador y evidencia de teclado, gestos y disposición en el entorno disponible. | Útil para QA visual; capturas y automatización no certifican FPS ni háptica. No reemplaza un dispositivo físico ni los profilers. |
| `visualize:visualize` | Comparar jerarquía, estados y conceptos de interacción antes de modificar la app. | Útil para decidir composición. El prototipo HTML anterior no valida Fabric, marcadores, teclado nativo o rendimiento. |
| `vercel:react-best-practices` | Revisión de hooks, suscripciones y componentes React. | Uso selectivo. Su contenido es principalmente React/Next y contiene recomendaciones web; no trasladar SWR, Tailwind, DOM o SSR a KROW. |
| `vercel:verification` | Método para seguir una tarea de extremo a extremo con evidencia. | Adaptar la secuencia a pantalla RN → API → respuesta; no utilizar browser como evidencia de una experiencia nativa. No ampliar este encargo al backend. |
| `openai-docs` | Documentación oficial sobre skills, empaquetado y límites de ejecución del agente. | Útil para revisar procedencia e incorporación de recursos; no es una skill de diseño móvil. |
| `skill-creator` / `skill-installer` | Codificar normas acordadas e incorporar un recurso revisado. | Disponibles para una decisión posterior. Crear una skill específica de KROW podría evitar nuevas divergencias; hoy basta la especificación y no se necesita instalación. |

No se identificó en el catálogo disponible una skill dedicada a perfilado de RN o a Apple HIG para móvil. Las de sitios, imagen y gráficos no sustituyen esa función.

### Recursos externos revisados

| Recurso y procedencia | Aporte y aplicación | Valor / decisión |
| --- | --- | --- |
| [Callstack · React Native Best Practices](https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/SKILL.md) | Perfilado, memoria, render y bundle. Promueve medir antes de optimizar. Último cambio del manifiesto consultado: 7 ago 2026, commit `fa0bad00ce4029ca3b4e63b2d950e8fe1b9299a2`. | **Alto** como referencia principal de rendimiento. No ejecutar automáticamente sus comandos ni incorporar herramientas adicionales de sus referencias. |
| [Callstack · React Navigation](https://github.com/callstackincubator/agent-skills/blob/main/skills/react-navigation/SKILL.md) | Navegación 7, hojas y safe areas. Indica seguir el estilo de API ya utilizado por una app existente. | **Alto** para revisar stacks/pestañas y presentación; respeta la API dinámica de KROW. |
| [Software Mansion · React Native Best Practices](https://github.com/software-mansion-labs/skills/blob/main/skills/react-native-best-practices/SKILL.md) | Referencias específicas de Reanimated, Worklets y gestos. Último cambio del manifiesto consultado: 16 sep 2026, commit `e3f00cdb34942cee8b788abe10fe0d78a7f2b4e9`. | **Alto como consulta dirigida**; comprobar cada regla contra versiones instaladas. Tiene el mismo nombre de skill que Callstack: no instalar ambos con colisión de nombres. |
| [Vercel · React Native Skills](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-native-skills/SKILL.md) | Reglas de listas, animación, navegación y safe areas; distinta de la skill React web disponible localmente. | **Medio** como checklist complementario. Algunas reglas prescriben FlashList, expo-image o Gesture.Tap de forma general; no justifican esas dependencias sin evidencia en KROW. |
| [Expo · Animation](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-animation/SKILL.md) y [Native UI](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-native-ui/SKILL.md) | Criterios de movimiento y controles nativos. Manifiesto Animation actualizado el 2 oct 2026, commit `13ad8e05874195633b5c185f6947bb6400e228fc`. | **Medio como referencia**, bajo como incorporación directa: presuponen Expo Router/Expo UI y añaden decisiones de plataforma que no corresponden al proyecto actual. |
| Apple HIG · [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) y [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) | Propósito del movimiento, causalidad, brevedad, control del usuario y háptica opcional. | **Alto** como criterio de producto. Adaptar a Android y a controles reales; no copiar toda la apariencia iOS ni introducir vidrio. |
| Documentación de [Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) y [React Native 0.84](https://reactnative.dev/docs/0.84/performance) | Restricciones de hilo, propiedades costosas y evaluación en builds optimizadas. | **Alto** como autoridad técnica por versión. No aplicar flags experimentales como optimización preventiva. |

Una discrepancia encontrada ilustra por qué estas skills requieren revisión: la referencia de animaciones de Software Mansion presenta `runOnJS` como eliminado en Reanimated 4; el código instalado de Reanimated 4.6.0 todavía lo reexporta y Worklets 0.12.2 lo implementa delegando a `scheduleOnRN`. Para código nuevo conviene la API actual; esa frase de una skill no justifica declarar roto ni reescribir código existente. La fuente local y la documentación/versionado prevalecen sobre recomendaciones genéricas.

Si se decide incorporar una skill, fijar repositorio/ruta/commit, leer manifiesto y referencias aplicables, revisar scripts, herramientas permitidas, red, comandos de instalación y cualquier envío de diagnósticos. Un manifiesto de instrucciones no equivale a un permiso de ejecución ni acredita todo el contenido enlazado. El alcance revisado aquí no constituye una auditoría completa de seguridad de cada repositorio. [OpenAI: skills](https://developers.openai.com/plugins/concepts/skills).

## 9. Rendimiento: cómo demostrar el beneficio

El objetivo es una respuesta estable a 60 Hz en dispositivos compatibles, con aproximadamente 16.67 ms por frame; 120 Hz dispone de aproximadamente 8.33 ms. No basta que una animación se ejecute fuera del hilo JS: mapas, composición, layout y renderizado nativo comparten recursos.

### Línea base

1. Seleccionar un Android físico de gama media representativo y un iPhone soportado. Registrar modelo, SO, Hz, variante, commit, tema y dataset. El emulador sirve para cobertura, no como sustituto del rendimiento físico.
2. Separar perfilado de commits React en entorno de desarrollo de medición de fluidez/CPU/memoria en release o build optimizada apropiada. No comparar números de debug contra release.
3. Usar herramientas existentes: React Native DevTools para renderizados, Android Studio/System Trace para trabajo nativo y frames, e Instruments para iOS. No añadir un inspector al release ni una nueva SDK de observabilidad para esta entrega.
4. Repetir el mismo recorrido y datos al menos tres veces antes/después. Separar carga de tiles/red de trabajo añadido por presentación; no atribuir mejoras de caché a la animación.

### Escenarios específicos de KROW

| Escenario | Qué medir y observar |
| --- | --- |
| Abrir/cerrar detalle y PlacePicker repetidamente | Frames de apertura/cierre, memoria tras varios ciclos, restauración de foco, backdrop inmóvil y teclado. |
| Ajustar aportación y cupo mientras el formulario tiene contenido | Commits del padre, respuesta del thumb, mismo valor final, scroll vertical y cancelación del gesto. |
| Expandir panel durante seguimiento | Frames, CPU/GPU, número de órdenes de cámara y ausencia de remontajes/reattach añadidos del mapa. |
| GPS vigente y luego obsoleto | Antigüedad correcta, retirada de ETA según reglas existentes, sin movimiento inventado ni pulsaciones infinitas. |
| Viajes con 30/60/100 elementos y direcciones largas | Tiempo de render/scroll, memoria, retención de posición, texto ampliado y acciones disponibles. Dataset de prueba explícito, no operaciones productivas. |
| Chat al abrir teclado, enviar y recuperar error | Anclaje, borrador, IDs, latencia visual y conservación de lectura de mensajes anteriores. |
| Publicar/buscar con red lenta o error | Feedback de carga estable; sin activar éxito por terminar una animación ni perder entradas. |
| Cambiar pestañas, tema y Reduce Motion | Sin animaciones fuera de foco, saltos, campos ocultos o pérdida de contexto. |

Registrar distribución de tiempos de frame y frames perdidos, latencia de feedback, commits y componentes responsables, CPU, memoria estable/máxima, y tamaño de APK/IPA con las mismas ABI y configuración si se propone una dependencia nueva. No usar únicamente FPS promedio: puede ocultar pausas puntuales.

Aceptar una mejora cuando aclare la tarea o reduzca una discontinuidad, respete accesibilidad y no produzca una regresión material frente a la línea base. Si el coste no se justifica, retirar el efecto y conservar feedback estático. Los límites exactos de memoria/CPU se acuerdan después de medir el dispositivo representativo; no se inventan cifras ni ganancias porcentuales.

## 10. Plan de implementación sin sobreingeniería

| Orden | Entrega | Dependencias nuevas | Salida revisable |
| --- | --- | --- | --- |
| 0 | Capturar línea base de las interacciones críticas y aplicar los fundamentos visuales ya definidos | Ninguna | Evidencia por plataforma, tema y estado. Criterios visuales y funcionales comunes. |
| 1 | A1–A3 y A10: pulsación, ciclo de vida de alertas/hojas y movimiento reducido | Ninguna | Un patrón de feedback y presentación; sin desmontaje anticipado, dobles animaciones ni foco perdido. |
| 2 | A5–A8: valores repetidos, teclado, listas y continuidad de datos | Ninguna | Formulario/lista/chat estables; callback y valores finales conservados. |
| 3 | A4/A9: panel animado y medición de mapa | Ninguna inicialmente | Mismo mapa montado, transición clara y sin coste de cámara por frame. |
| 4 | Prueba de arrastre del panel, solo si el beneficio persiste | Candidatos Gesture Handler 2.33.1 + Bottom Sheet 5.2.14 | Build Android/iOS y matriz de conflictos resueltos. Adoptar o descartar con evidencia antes de extenderlo. |
| 5 | M1–M9 según beneficio observado; háptica M10 al final si se justifica | Háptica opcional, un único proveedor | Refinamientos consistentes y pruebas físicas. No extender el alcance a nuevas capacidades. |

En cada entrega ejecutar TypeScript, lint y pruebas existentes relevantes: pulsación/tema, controles de cupo/aportación, teclado/autocompletado, mapas, publicación/reserva y piloto/chat/runtime cuando se afecte su presentación. Añadir pruebas de comportamiento cuando cambien montaje, cierre, foco o selección; no tests que solo repitan estilos.

Mantener completamente las reglas de autenticación, aprobación del conductor, origen ITNL, paradas, cupo, publicación, reserva, comandos, cobros y estados. No modificar backend, contratos, geometrías, frecuencia GPS, cola offline, permisos o flags para lograr un efecto visual. Una confirmación visual o háptica refleja el estado verdadero de la operación y nunca lo sustituye.
