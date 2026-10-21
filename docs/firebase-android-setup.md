# Preparar Firebase para KROW Android

Alcance acordado: Android. La autenticación y base de datos permanecen en Supabase; Firebase se usará para FCM.

**Estado más reciente:** APK **0.7.0-trial** y API `54fa0b9d-1d40-49c3-ae0a-6b1ef0b167cf`. `PILOT_PUSH_ENABLED` y `KROW_PILOT_PUSH_ENABLED` están en **true** para aceptación privada. Google FCM aprobó `validate_only` con HTTP 200, sin entregar avisos. El permiso Android 13+ se solicita al abrir y el registro se hace automáticamente tras login si está concedido; Perfil conserva activación y ajustes. Registro/recepción/apertura físicos siguen pendientes. Ver [permisos y continuación](permissions-recurrence-20261020.md). Los apartados de preparación siguientes documentan el estado histórico con flags en false.

## Estado verificado: 20 de octubre de 2026

- Proyecto existente autorizado: **KrowApp**, ID **`krowapp`**, número `671728344534`.
- Aplicación creada: **KROW Android**, ID `1:671728344534:android:8b8c61c0ec6b88fe801877`, paquete **`com.krownmobileapp`**.
- Configuración pública descargada mediante la CLI oficial a **`android/app/google-services.json`**, archivo excluido de Git. El importador del build validó los valores reales sin imprimir claves.
- Credencial de servidor recibida mediante una ruta local fuera de los repositorios; proyecto, tipo RSA y firma local verificados. Google aceptó el intercambio OAuth ejecutado con el proveedor compilado existente de NestJS, sin imprimir tokens ni enviar avisos. Esto comprueba autenticación; el permiso de envío y la entrega FCM aún no están validados.
- Las cuatro variables de FCM/cifrado se configuraron inicialmente en Railway con **`skipDeploys=true`**, sin imprimir ni copiar la clave al código. Después se publicó la API compatible con despliegue **`5d625538-76ab-4961-890d-493a72978442`** y estado **SUCCESS**; once comprobaciones HTTP y el transporte WebSocket aprobaron.
- **`PILOT_PUSH_ENABLED=false`** y **`KROW_PILOT_PUSH_ENABLED=false`**. No se ha probado recepción en un teléfono.
- APK **`0.5.3-trial`**, código 10, compilado y verificado: firma de prueba existente, Hermes, cuatro recursos nativos Firebase contrastados con el JSON, receptor/permisos FCM y dominio HTTPS correctos. [Evidencia](android-apk-0.5.3-20261020.json). No instalado; ADB no detectó dispositivos.

La autenticación de la CLI permite administrar el proyecto desde este equipo. El servidor de Railway necesita su propia identidad; no se copiarán los tokens personales de la CLI al backend.

## Pasos en la consola

El proyecto, la aplicación Android y las credenciales de servidor ya están preparados; no hay que repetir esos pasos ni generar otra clave.

1. **API HTTP v1 habilitada según confirmación del usuario el 20 de octubre de 2026.** No se ha validado todavía el permiso de envío mediante una petición real de NestJS a FCM. La configuración se consulta en [Cloud Messaging](https://console.firebase.google.com/project/krowapp/settings/cloudmessaging).
2. Conserva el JSON privado existente fuera de ambos repositorios. Las credenciales del servidor ya se transfirieron al servicio NestJS. No hay que descargarlas otra vez ni copiarlas al APK. [Autorización del servidor](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

No necesitas crear Firestore, Realtime Database, Firebase Authentication ni un proyecto iOS para este alcance.

## Configuración Android preparada

KROW ya inicializa Firebase mediante `FirebaseOptions` en su módulo nativo. El build admite el archivo del cliente sin añadir plugins o dependencias:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-trial.ps1 -FirebaseConfigFile "android/app/google-services.json" -ValidateOnly
```

El comando comprueba el paquete y los campos requeridos sin compilar ni mostrar claves. Para compilar posteriormente, omite `-ValidateOnly`. Rechaza archivos de cuenta de servicio.

| Valor nativo | Campo del JSON del cliente |
| --- | --- |
| `KROW_FIREBASE_APP_ID` | `client[].client_info.mobilesdk_app_id` de `com.krownmobileapp` |
| `KROW_FIREBASE_API_KEY` | `client[].api_key[].current_key` |
| `KROW_FIREBASE_PROJECT_ID` | `project_info.project_id` |
| `KROW_FIREBASE_SENDER_ID` | `project_info.project_number` |

El build exporta estos valores solo durante su proceso y restaura el entorno. No los añade al bundle de React Native. El SDK está integrado; no agregues el plugin de Google Services ni otra librería sin revisar esta inicialización. Referencia de [configuración programática](https://github.com/firebase/firebase-android-sdk/blob/main/firebase-installations/REQUIRED_FIREBASE_OPTIONS_ANDROID.md).

La restauración elimina explícitamente las variables originalmente ausentes: PowerShell 7.6 podía convertir `$null` en una cadena vacía. Tras corregirlo, las cuatro comprobaciones sintéticas aprobaron tanto en PowerShell 7 como en Windows PowerShell: importación válida, restauración, rechazo de claves de servidor y rechazo de otro paquete. La validación con el JSON real también aprobó.

## Configuración posterior del backend

Variables ya configuradas para el servicio NestJS en Railway, conservadas para el despliegue del 20 de octubre:

- `FCM_PROJECT_ID`: `project_id` del JSON privado.
- `FCM_CLIENT_EMAIL`: `client_email`.
- `FCM_PRIVATE_KEY`: `private_key`, conservando los saltos de línea o su representación `\n`.
- `PILOT_PUSH_ENCRYPTION_KEY`: clave aleatoria de 32 bytes en base64, exclusiva del servidor.

Mantener `PILOT_PUSH_ENABLED=false` y `KROW_PILOT_PUSH_ENABLED=false` hasta verificar proyecto, credenciales, permisos y compilación. Activarlos coordinadamente después; no basta con cambiar esos flags.

## Verificación pendiente

Instalar el APK compatible en un Android con Google Play Services, iniciar sesión y activar avisos desde KROW. Android 13+ solicita permiso. Verificar eventos de reserva, aceptación, cancelación y cambio de viaje con la app abierta, en segundo plano y con el proceso cerrado. El cierre forzado por el usuario tiene restricciones del sistema; no equivale a recepción garantizada. [Recepción en Android](https://firebase.google.com/docs/cloud-messaging/android/receive-messages).

KROW envía mensajes **data** con `intentId`, `rideId`, `kind`, `expiresAt` y `recipientId`. El receptor verifica caducidad y cuenta antes de presentar una notificación local. Una prueba del compositor de Firebase no sustituye la verificación de esos eventos ni de su apertura. No incluir tokens FCM, datos personales ni claves en capturas o informes.

La compatibilidad con la API ya está verificada y el APK 0.5.3 puede iniciar pruebas privadas con cuentas existentes. La aceptación física y la verificación de los enlaces de Supabase Auth siguen pendientes. Después se activarán los flags de forma coordinada y se verificará registro/recepción/apertura con eventos reales. La sesión de la CLI no sustituye a la credencial del servidor.
