# KROW · Solicitudes, notificaciones y diálogos

21 de octubre de 2026. Revisión adicional sobre la modernización existente. Se conservaron los cambios locales previos, las dependencias, los contratos API y los flujos de conductor y pasajero. No se modificó el backend.

**Decisiones de diseño e implementación**

| Área | Hallazgo | Resultado |
| --- | --- | --- |
| Solicitudes | El inicio mostraba una superficie con título, descripción y un botón completo. La alternativa antigua utilizaba otra fila. | `RequestsShortcut` reúne icono, texto de estado y badge en un único acceso táctil. Se reutiliza en ambas variantes del inicio y conserva cada destino de navegación. |
| Pendientes | El número ya estaba disponible desde la bandeja o el contador existente. | El badge cuenta únicamente solicitudes que el conductor puede responder. Muestra hasta `99+`, mientras la etiqueta accesible anuncia el número completo. No se introduce otro contador ni nuevas consultas. |
| Carga y errores de solicitudes | Un cero podía confundirse con información todavía no recuperada. | Carga, bandeja al día y fallo de actualización tienen mensajes diferentes. Un fallo oculta el badge para no presentar un número antiguo como vigente. El acceso sigue disponible. El pasajero conserva su acceso al estado de reservas. |
| Notificaciones | El botón anterior ejecutaba el registro, pero no consultaba ni mostraba el permiso actual. | `NotificationSettings` muestra un interruptor, icono y estado textual basado en la lectura del dispositivo. La carga o un estado desconocido no se presentan como un permiso denegado. |
| Cambios en Ajustes | El permiso podía cambiar mientras KROW estaba en segundo plano. | Se consulta al enfocar el perfil y al volver a primer plano. Las respuestas anteriores se descartan y no se actualiza un componente desmontado. |
| Confirmaciones y alertas | Existían llamadas a `Alert.alert`, un modal de alerta propio y otra presentación para confirmaciones. | `Dialog`, `DialogProvider`, `DialogHost` y `dialogService` proporcionan una presentación común con cola de mensajes y acciones protegidas frente a doble pulsación. |
| Cierre de sesión | Utilizaba una alerta nativa. | Usa el diálogo de KROW con tema claro/oscuro, explicación sobre el GPS, acción destructiva explícita y cancelación. Los callbacks de detener seguimiento, cerrar sesión y limpiar caché se conservan. |
| Diálogos dentro de paneles | Una alerta podía necesitar mostrarse mientras un selector seguía abierto. | `modalLayers` sitúa el diálogo en la ventana existente del panel. La regresión comprueba que solo hay una ventana nativa y que Atrás no cierra el panel situado detrás de una alerta bloqueante. |

El acceso a solicitudes mantiene texto identificable junto al icono. El usuario puede reconocer la bandeja y leer qué requiere respuesta sin aprender un símbolo nuevo. El área completa es un único botón accesible, sin controles anidados. El badge utiliza los colores semánticos del tema y la iconografía MaterialIcons existente.

**Permiso del sistema y registro de avisos**

El interruptor no simula que KROW pueda revocar permisos del sistema. Si están activados, abre Ajustes para desactivarlos y mantiene el valor real hasta leer el cambio al regresar. Si falta autorización, permite solicitarla cuando el sistema lo admite; en los demás casos facilita el acceso a Ajustes. Una denegación no activa el control.

En Android se comprueban el permiso de Android 13+, la autorización general de la app, el canal `krow_trip_updates` y su grupo si existe. Esto evita mostrar como habilitados los avisos cuyo canal está bloqueado. El control mantiene separado un fallo de registro de entrega del estado del permiso: un error de conexión no convierte un permiso concedido en uno denegado y dispone de reintento.

En iOS se añadieron métodos pequeños al módulo nativo existente para consultar `UNUserNotificationCenter` y solicitar autorización expresamente. Los estados autorizado, provisional y efímero se consideran permitidos; no determinado, denegado y desconocido se distinguen. No se pide permiso de Android en iOS ni se altera la solicitud automática de arranque existente.

La entrega push del modo piloto ya estaba limitada a Android. Esa limitación no se amplió hacia otro backend ni se ocultó: el perfil de iOS informa de ella cuando no está habilitado el runtime. El permiso de iOS puede leerse y administrarse, pero concederlo no certifica la entrega de mensajes. El runtime conserva su registro existente cuando corresponde.

Referencias utilizadas para estas decisiones: [ajustes de notificaciones en Apple](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/getnotificationsettings%28completionhandler%3A%29), [estado de canales Android](https://developer.android.com/reference/android/app/NotificationChannel) y [acceso a Ajustes mediante React Native](https://reactnative.dev/docs/linking).

**Sistema compartido de modales**

Los diálogos distinguen confirmación, advertencia, error, éxito e información mediante icono y color semántico. Comparten tipografía, separación, radios, fondo, botones y transiciones. Las acciones destructivas conservan texto y color específico; cancelar sigue siendo una acción separada. Las acciones quedan fuera del contenido desplazable para mantenerlas disponibles con mensajes largos.

`AnimatedModal` concentra la única importación de `Modal` desde React Native en `src`. Admite panel inferior y diálogo centrado, contenido conservado durante la salida, reducción de movimiento, límites de altura, área segura, teclado y foco inicial. Los diálogos tienen ancho flexible y máximo de 480 puntos; los paneles de mapas conservan su composición amplia. Las filas y botones pueden crecer con el texto. Los ajustes de notificaciones utilizan acciones de ancho completo para permitir que las etiquetas largas se ajusten en pantallas estrechas.

`CustomAlert` y `useConfirmation` mantienen sus interfaces como adaptadores del servicio global. Se migraron las 35 llamadas de alerta de la aplicación: perfil, navegación raíz, publicación, favoritas, búsqueda, actividad, viajes antiguos y runtime. También se reutiliza la base en los selectores de opciones. Los permisos del sistema conservan su presentación nativa obligatoria.

La cola ejecuta cada acción una vez, ignora callbacks de solicitudes ya resueltas y se limpia al cambiar la sesión. Las confirmaciones pendientes se cancelan al desmontar su propietario. Se conserva el aviso bloqueante de viaje cancelado: no puede cerrarse con Atrás o el fondo y solo se reconoce mediante su acción explícita. Se agregó una regla de ESLint que impide reintroducir `Alert` desde `react-native` en el código de la aplicación.

**Componentes y archivos principales**

| Componentes | Responsabilidad |
| --- | --- |
| `features/pilot/RequestsShortcut.tsx`, `home/screens/HomeScreen.tsx` | Acceso a solicitudes, estado y badge. |
| `features/pilot/NotificationSettings.tsx`, `notificationPermission.ts`, `ProfileScreen.tsx` | Lectura de permiso, interruptor, Ajustes y recuperación de errores de registro. |
| `KrowNotificationsModule.kt`, `KrowNotifications.swift`, `KrowNotificationsBridge.m` | Consulta real del dispositivo mediante módulos nativos existentes. |
| `ui-v2/Dialog.tsx`, `DialogHost.tsx`, `dialogService.ts`, `modalLayers.ts` | Diálogos temáticos, cola, presentación y coordinación con paneles. |
| `ui-v2/AnimatedModal.tsx`, `useConfirmation.tsx`, `ui/CustomAlert.tsx` | Base modal común y compatibilidad con las pantallas actuales. |
| `ui/Dropdown.tsx`, `DropdownInput.tsx` | Selectores con la misma base, cierre y espacio inferior seguro. |
| `app/App.tsx`, `navigation/RootNavigator.tsx`, `.eslintrc.js` | Integración global, limpieza por sesión y prevención de alertas inconsistentes. |

Se reutilizaron React Native, MaterialIcons, el tema y los componentes `ui-v2`. La revisión de React siguió los criterios aplicables de la skill `vercel:react-best-practices`. No se instalaron bibliotecas nuevas.

**Validación**

| Comprobación | Resultado |
| --- | --- |
| TypeScript | Correcto. |
| ESLint | Sin errores, incluida la prohibición de alertas nativas de aplicación. |
| Jest completo | 48 suites y 288 pruebas correctas. |
| Nuevas regresiones | Lectura de permisos, denegación, vuelta desde Ajustes, fallo de consulta, doble pulsación, fallo de registro, iOS sin APIs Android, canal bloqueado, badge y roles, cola de alertas, confirmación deliberada y aviso bloqueante. |
| Diálogos sobre paneles | Una ventana nativa, conservación del panel y comportamiento de Atrás comprobados en pruebas de componentes. |
| Regresiones existentes | Publicación, búsqueda, reservas, seguimiento, finalización, chat, autenticación, cachés y permisos continúan pasando. |
| Android nativo | `:app:compileTrialKotlin --offline --no-daemon --console=plain`: compilación correcta. Se mantuvieron advertencias de APIs obsoletas existentes. |
| Metro | Paquetes de producción de Android e iOS generados correctamente. |
| Inventario estático | 35 llamadas migradas, ninguna importación de `Alert` nativo y una sola base que importa `Modal`. Nuevos nombres MaterialIcons válidos. |
| Git | `git diff --check` correcto. |

Las primeras ejecuciones permitieron corregir expectativas de pruebas que consultaban la API de alerta anterior. La compilación Gradle necesitó salir del aislamiento porque este impedía la conexión con su proceso local; posteriormente finalizó correctamente. Las evidencias están en `.tmp/ui-review-requests-20261021/`.

Se revisaron las restricciones de distribución para anchos de 320, 390 y 768 puntos: texto flexible, badge compacto, botones sin altura fija y diálogo limitado por el espacio disponible. Esto es una revisión estructural, no una captura ni medición del diseño nativo.

ADB confirmó que no hay dispositivos conectados; no hay emulador Android ni Xcode. Quedan pendientes la compilación nativa de iOS y la verificación visual real en ambos sistemas: tamaños y letra ampliada, VoiceOver/TalkBack, foco, teclado, transiciones y cambios de permiso desde Ajustes. Metro y las pruebas de componentes no sustituyen esas verificaciones.

**APK generado posteriormente a solicitud del usuario:** `artifacts/android/krow-0.8.0-trial.apk`, código 13. `:app:assembleTrial` terminó correctamente en 3 min 50 s. Se verificaron firma de prueba compatible con versiones anteriores, paquete, Android mínimo 24, Hermes para ARM64 y ARM de 32 bits, fuente MaterialIcons, textos de la interfaz actualizada y recursos Firebase contrastados con la configuración local. Conserva push habilitado y no necesita Metro. Evidencia y SHA-256 en [android-apk-0.8.0-20261021.json](android-apk-0.8.0-20261021.json). No instalado ni probado en un dispositivo físico.
