# Piloto Android: configuración y validación

Actualizado: 6 de octubre de 2026. El código del piloto está integrado, pero
todavía no se ha certificado en Android físico ni distribuido un release productivo.
El APK privado de prueba ya está generado y su firma, manifiesto y bundle aprobaron.
La API publicada en Railway ya devuelve `pilot: ready` y autentica contra
PostgreSQL con el LOGIN limitado. Los flags piloto y GPS están habilitados en
la configuración del APK de prueba; push y cierre de cuenta permanecen apagados.

## Alcance disponible en código

- Inicio/Viajes/Perfil, modo por cuenta, tema persistente y estados compartidos.
- Viaje programado con reserva, paradas, precio y acciones por participante.
- Búsqueda por recorrido/paradas/resultados, reserva revisada, publicación con
  errores por campo y salida protegida; favoritas con valores opcionales.
- Viaje activo con mapa, vehículo, encuentro/descenso, próxima parada y pasajeros
  que el conductor debe atender. La subida/bajada requiere confirmación manual.
- Chat de texto por reserva, historial real, efectivo y reseñas opcionales.
- GPS online Android independiente de Mapbox/runtime avanzado. No incluye voz,
  giro a giro, mapas offline ni continuidad tras force-stop o reinicio del teléfono.
- Recuperación de acceso mediante dominio autorizado, enlaces HTTPS y sesión
  almacenada en Keychain/Keystore. El almacenamiento anterior se migra al seguro.

Los flujos principales usan tokens y componentes compartidos. Todavía falta
validarlos visualmente en dispositivo, completar borradores y terminar
la adopción del sistema de diseño en pantallas legacy.

El viaje activo conserva el mapa a pantalla completa mientras se expande el
panel de pasajeros/acciones. El conductor ve nombres por subir/bajar; el pasajero
su punto de encuentro y descenso. Antes de comenzar se comprueba ubicación
precisa y disponibilidad del módulo Android. Un permiso denegado conserva el
viaje programado y ofrece feedback, sin iniciar una captura ficticia.

## Preparación de entornos

1. Instalar Node 22, Java 17 y Android SDK/build tools 36, con NDK
   `27.1.12297006`. Configurar `JAVA_HOME` y `ANDROID_HOME` correctamente.
2. Ejecutar `npm ci`. Copiar `.env.example` a `.env` y proporcionar Auth/API
   de staging. El backend debe haber completado su activación coordinada.
3. Activar `KROW_PILOT_ENABLED=true` y `KROW_TRACKING_ENABLED=true` solo cuando
   API y código nativo estén listos. Mantener `KROW_RUNTIME_ENABLED=false` para
   el piloto online; los dos runtimes no deben activarse por accidente.
4. Configurar `KROW_ANDROID_MAPS_API_KEY` en el entorno de compilación o
   `android/local.properties`, restringida a paquete `com.krownmobileapp` y SHA
   de firma. No introducir la clave REST de la API en el cliente.
5. Para recuperación de cuenta, proporcionar `KROW_AUTH_REDIRECT_URL` HTTPS
   con path `/auth`, mismo host que el `KROW_LINK_ORIGIN` nativo. Autorizar el
   redirect en Supabase y publicar `assetlinks.json` con certificado real en
   ese dominio. Comprobar verificación del app link en el dispositivo.
6. El consentimiento de push es independiente: activar
   `KROW_PILOT_PUSH_ENABLED` después de configurar Firebase y backend FCM.
   Variables públicas de build: `KROW_FIREBASE_APP_ID`, `KROW_FIREBASE_API_KEY`,
   `KROW_FIREBASE_PROJECT_ID`, `KROW_FIREBASE_SENDER_ID`. Las credenciales de
   servidor FCM jamás pertenecen a `.env` móvil ni al APK.
7. Configurar `KROW_SUPPORT_URL` y `KROW_PRIVACY_URL` solo con contactos/aviso
   reales. Actualmente están vacíos. Mantener
   `KROW_ACCOUNT_CLOSURE_ENABLED=false`: la API registra cierre de acceso,
   pero su worker de purga/anonimización depende de política todavía pendiente.

Cambiar configuración nativa exige recompilar e instalar; reiniciar Metro no
actualiza recursos, firma, mapas ni enlaces.

## Comprobaciones y build

Desde la raíz:

```text
npm run typecheck
npm run lint -- --quiet
npm test -- --runInBand
```

Desde `android`, en PowerShell con SDK y Java disponibles:

```powershell
.\gradlew.bat :app:compileDebugKotlin --no-daemon --stacktrace
.\gradlew.bat :app:assembleRelease --no-daemon --stacktrace
```

En Linux/macOS usar `./gradlew`. El workflow `quality.yml` prepara el entorno
nativo y compila Kotlin debug, pero no firma ni certifica el release.

Release exige variables `KROW_RELEASE_STORE_FILE` (ruta absoluta recomendada),
`KROW_RELEASE_STORE_PASSWORD`, `KROW_RELEASE_KEY_ALIAS` y
`KROW_RELEASE_KEY_PASSWORD`, además de la clave de Maps Android. Gestionarlas
como secretos de build; no guardarlas en Git. El build falla si faltan y no
usa la firma debug como alternativa. Incrementar `KROW_VERSION_CODE` para
cada distribución y definir `KROW_VERSION_NAME` según la entrega.

## Comportamiento GPS esperado

El conductor inicia la captura con la app visible y permiso de ubicación precisa.
La notificación persistente indica que el GPS sigue activo. Muestreo objetivo:
dos segundos en movimiento, cinco detenido. Socket recibe snapshots cada dos
segundos y REST ofrece respaldo cada cinco; esos intervalos no certifican una
latencia real determinada.

Se considera reciente una posición de hasta diez segundos; después aparece su
antigüedad. A partir de treinta segundos se considera desactualizada. La ETA
solo se calcula con señal reciente/precisa y posición próxima al recorrido;
no usa tráfico y requiere calibración. No se muestra una ETA vigente con señal
obsoleta ni se anima una posición desactualizada.

La ruta operativa incluye las subidas confirmadas y sus bajadas futuras. Al
abordar, el panel pasa a descenso; las demás identidades no se muestran al
pasajero. La app conserva el canvas del mapa al actualizar el recorrido.

La API guarda únicamente última posición. La cola local está cifrada y cubre
hasta diez minutos de pérdida de conexión. Finalizar/cancelar revoca la sesión;
logout detiene captura local y solicita revocación remota. Una reserva
completada/cancelada pierde acceso a ubicación. Las credenciales expiran a seis
horas: se debe abrir la app para reanudar. Después de reiniciar/force-stop no
se promete captura automática. Estas condiciones se deben comprobar físicamente.

Referencias de plataforma: [inicio de servicios foreground](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
y [permisos de ubicación](https://developer.android.com/develop/sensors-and-location/location/permissions).

## Matriz de aceptación pendiente

Usar al menos dos Android físicos, uno de gama media como referencia, build
release y staging con catálogo/conductor/unidad aprobados. Registrar modelo,
Android, versión, red y resultados; nunca publicar coordenadas de usuarios reales
en logs o capturas de pruebas.

| Prueba | Resultado necesario |
| --- | --- |
| Dos cuentas y último asiento | Publicar, buscar, reservar, aceptar, chat, iniciar, subir, bajar, efectivo, cerrar y reseñar; sin sobreventa ni reservas duplicadas. |
| Ruta al iniciar | Recorrido visible antes del primer GPS; luego vehículo y próxima parada coherentes con reservas. |
| Antes/después de abordar | Pasajero ve encuentro y luego descenso; conductor ve nombres correctos por acción y confirma manualmente. |
| Recorrido de treinta minutos | Incluye uso visible, app minimizada y pantalla bloqueada. Notificación persistente y captura continua mientras sea permitido. |
| Señal con red estable | Medir antigüedad p95 ≤5 s y reconexión ≤10 s; son objetivos pendientes, no resultados obtenidos. |
| Sin GPS/red/permisos | Mensajes útiles, señal antigua identificada, ETA oculta cuando corresponda y reanudación controlada. |
| Reinicio API/teléfono/force-stop | Snapshot REST recuperable; app visible permite reanudar GPS sin duplicar capturas/sesiones. |
| Cancelación, descenso y cierre | Pasajero sin acceso GPS después de salir; servicio y cola detenidos/limpios al finalizar o logout. |
| Cambio de cuenta | Sin caches, mensajes, ubicación o notificaciones del actor anterior. |
| Email de acceso/recuperación | Link autorizado abre app correcta, verificación/contraseña real y errores recuperables. |
| FCM fuera de la app | Reserva/chat/proximidad llegan, enlace autorizado funciona y cuenta anterior no recibe contenido. |
| Pequeña pantalla/texto grande | Sin contenido recortado, CTA accesible, teclado no tapa acciones; precios/paradas siguen legibles. |
| Claro/oscuro y movimiento reducido | Contraste, superficies y transiciones consistentes en cada estado. |
| TalkBack | Labels, selección, errores, mensajes de estado y foco de confirmaciones comprensibles. |
| Rendimiento release | Medir frames, arranque, mapa, listas, consumo de batería y actualización sin parpadeos. |
| Cinco estudiantes de primer uso | ≥80 % de tareas completadas sin ayuda y cero bloqueos del flujo principal. |

## Evidencia local

TypeScript, lint sin errores y 111 pruebas móviles aprobaron. Lint conserva
advertencias de estilos inline y otros puntos de mantenimiento. No hay evidencia física ni
capturas actuales todavía. La revisión inicial encontró Java 8 y ningún SDK.
Ahora se preparó un entorno portable Java 17/SDK 36 y `:app:compileDebugKotlin`
aprobó el 6 de octubre, incluido el servicio GPS y todos los módulos nativos.
Se corrigió la expresión Gradle de `versionCode`, que impedía evaluar la app.
El workflow instala las herramientas SDK con Java 21 y compila con Java 17;
su ejecución en CI sigue pendiente. Metro generó el bundle
JavaScript de producción Android y `npm ci --dry-run --ignore-scripts --offline`
verificó la consistencia del lockfile. La compilación Kotlin no reemplaza el
empaquetado e instalación del APK ni demuestra continuidad GPS en un dispositivo.
Después aprobó `assembleTrial` con ARM64 y ARMv7. El resultado es
`artifacts/android/krow-trial.apk` (136760626 bytes, unos 130 MiB). La verificación
comprobó firma debug esperada, paquete `com.krownmobileapp`, API mínima 24,
`debuggable=false`, HTTP sin cifrar desactivado y bundle Hermes incluido. Los
recursos del APK contienen la API Railway y piloto/GPS activados. La comprobación
de sus 1490 entradas ZIP no encontró la credencial privada de PostgreSQL.
Ver [evidencia del APK](android-apk-20261006.json). Falta instalación y GPS físicos.

La revisión corrigió recuperación PKCE, sesión vieja después de un evento Auth,
reserva nueva ocultada por una cancelada, dobles envíos, reintentos de chat y
publicación, y GPS/push pendientes después de cerrar sesión. La limpieza nativa
de un inicio antiguo apunta a su sesión y no detiene una captura más nueva.
Cada cuenta conserva un identificador FCM propio; una respuesta tardía del
proveedor no elimina un token renovado. Instantáneas REST/Socket se ordenan por
`observedAt` del servidor para no retroceder paradas ni posición.
Una respuesta tardía no cambia la navegación después de salir de la pantalla.
Salir durante el permiso GPS cancela el inicio aún no enviado; terminar un viaje
detiene únicamente la sesión nativa correspondiente, incluso si ya comenzó otra.

La segunda pasada también impide que la restauración lenta del tema o movimiento
reducido sobrescriba la decisión/evento más reciente. Se retiró el handler de
error temporal que escribía logs globales.

Se actualizaron CLI 20.2.0 y dependencias transitivas compatibles. Reanimated
permanece en 4.6.0 y Worklets en 0.12, compatibles con RN 0.84; no se forzaron
upgrades de React Native. `npm audit --omit=dev` conserva 34 avisos agregados
(29 altos y cinco moderados, cero críticos) en herramientas Metro/CLI/Jest y
parsers. Es trabajo pendiente del toolchain; no representa 34 fallos independientes
del APK. La API/web quedó sin avisos npm en dependencias de producción.

La base Supabase contiene la estructura del piloto y el LOGIN privado autorizado,
verificado por TLS. Railway aprobó readiness real con piloto/GPS activos. El APK
de prueba usa `https://krow-api-production.up.railway.app` sin añadir `/v1`.

La salida del piloto depende además de zona/catálogo, soporte con responsable,
firma, credenciales, aviso y retención aprobados. Ninguno de esos datos ausentes
se sustituye por valores de ejemplo en producción.

## APK privado de prueba sin Metro

La variante `trial` conserva los módulos nativos y compila JavaScript/Hermes en
el APK. Usa el certificado debug del repositorio, sin modificar la firma ni los
requisitos de `release`. Está destinada a pruebas privadas; no es el artefacto
para publicar en Google Play. Su paquete sigue siendo `com.krownmobileapp` y
requiere Android 7 o superior. Una instalación con otro certificado del mismo
paquete no se puede actualizar con este APK.

Crear un archivo ignorado `.env.trial` exclusivamente con configuración pública
móvil. `KROW_API_URL` debe apuntar a la API HTTPS desplegada. Proporcionar también
la URL y clave anon/publishable reales de Supabase. Nunca copiar el `.env` del
backend: `react-native-config` incorpora sus campos en recursos de la app. El
script rechaza campos ajenos al cliente y claves privadas detectables.

La clave `KROW_ANDROID_MAPS_API_KEY` se proporciona por entorno de compilación o
`android/local.properties`. Debe permitir Maps SDK for Android y estar restringida
al paquete y SHA del certificado debug. La compilación trial falla si falta la
clave o si la API apunta a localhost. Los flags GPS/piloto deben concordar con
la configuración verificada del backend; push y recuperación requieren sus
credenciales/dominio antes de poder probarlos.

```powershell
.\scripts\build-android-trial.ps1
```

El resultado se copia a `artifacts/android/krow-trial.apk` (ignorado por Git),
junto con su SHA256 impreso al terminar. Por defecto incluye ARM64 y ARMv7; se
puede usar `-Architectures arm64-v8a` para un dispositivo reciente conocido.
Después de instalarlo no requiere Metro ni el servidor local.

En este equipo se descargaron Java 17/21 de Microsoft y las herramientas Android
oficiales en `node_modules/.cache/android-toolchain`, sin cambiar herramientas
globales. Los ZIP se verificaron contra los SHA256 publicados. El script detecta
ese entorno portable y restaura las variables de proceso al terminar. La caché
Gradle usa `.g/` dentro del repo, excluida de Git: su ruta corta evita que Ninja
supere el límite de 260 caracteres de Windows con las cabeceras de React Native.
React Native utiliza el toolchain Java 17; Java 21 se reserva para las herramientas
SDK recientes. Usar solo Java 21 provoca un fallo del resolver de toolchains
incluido por React Native al intentar aprovisionar Java 17 con Gradle 9.

Fuentes de instalación: [OpenJDK de Microsoft](https://learn.microsoft.com/en-us/java/openjdk/download)
y [herramientas de Android](https://developer.android.com/studio). Java 17 es
la versión recomendada en la [configuración oficial de React Native](https://reactnative.dev/docs/set-up-your-environment).
