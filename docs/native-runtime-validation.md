# Navegación nativa y validación local — 30 de septiembre de 2026

## Implementación

Se añadió `KrowNavigation` en Kotlin y Swift, con contrato React Native común.
Android usa Navigation 3.23.0 (NDK 27); iOS fija Navigation 3.23.0 y Maps 11.23.0
en una sola resolución SPM. El proyecto iOS incorpora ambos archivos del puente.

- Preparación descarga estilo, teselas cartográficas y descriptor de navegación.
  La región es una envolvente rectangular del recorrido ampliada aproximadamente
  10 km; puede descargar más superficie que un corredor ajustado. Los fallos de
  cuota, almacenamiento o conexión rechazan la preparación.
- Navegación nativa hacia **la siguiente parada pendiente**. Las demás conservan
  su orden en la cola de KROW. Una llegada GPS no confirma pasajeros ni elimina
  paradas. La salida confirmada o pendiente guardada cambia el destino nativo.
- El SDK genera un recorrido local **provisional**, visible para el conductor.
  Todavía no se importa exactamente la geometría del servidor ni se publica esa
  propuesta al pasajero. La reconciliación de una ruta única compartida sigue
  siendo una condición de lanzamiento, incluso con conexión.
- Android usa observadores de desvío y recálculo híbrido; iOS usa el recálculo
  híbrido del SDK sobre un único destino comprometido. Fuera de la región
  descargada el cálculo puede fallar; nunca se afirma cobertura universal.
- Voz Android mediante una voz española instalada que no necesita red; si falta,
  se informa al usuario. iOS selecciona `TTSConfig.localOnly`.
- Ubicación capturada nativamente en segundo plano, con intervalos de 2/5/15 s
  según velocidad. La pantalla del conductor usa la observación local, distingue
  navegación provisional y deja de presentar ETA central cuando está desactualizada.
- SQLite con registros AES-GCM y Android Keystore; en iOS, registros atómicos
  AES-GCM y clave Keychain `AfterFirstUnlockThisDeviceOnly`, excluidos de backups.
  Límite de 24 h/86.400 muestras y lotes de 100. Los acuses requieren confirmación
  durable completa; las secuencias no se reutilizan después de limpiar una sesión.
- Entrega HTTPS nativa mientras el sistema permita la sesión de ubicación, con
  URL del viaje y token temporal, sin redirecciones. Se conserva la cola ante
  errores. La renovación del token requiere volver a ejecutar la app; al vencer,
  continúa la navegación local y se suspende el envío hasta renovar la sesión.
- Recuperación de la sesión guardada y comprobación del TileRegion al abrir;
  cierre del seguimiento al terminar o cerrar sesión. Una sesión nueva reemplaza
  la cola de una sesión anterior; reanudar usa su identificador guardado.
- Inicio protegido contra doble toque; una sesión recién abierta se revoca si
  falla el inicio nativo. La restauración tardía de otra pantalla no cambia el
  viaje visible. El marcador usa el GPS local y se oculta la ETA central obsoleta.
- Registro push se revalida al volver a primer plano; cierre de sesión desactiva
  la presentación local e intenta revocar el dispositivo en KROW. Cuenta distinta
  reconstruye la navegación y vuelve a registrar el dispositivo.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| TypeScript móvil | Pasó |
| Jest móvil | 20 pruebas, 8 suites; incluye 7 pruebas nuevas de acuses y aislamiento |
| APK Android Debug completo | Pasó `:app:assembleDebug` |
| Android real dentro del emulador Pixel 6 API 34 | Pasó `NavigationJournalTest`: AES-GCM/Keystore, reapertura, lote de 100, acuses parciales y acuse tardío tras limpiar sesión |
| iOS | XML de Info.plist y referencias de fuentes revisados; **validación pospuesta por indicación del usuario**, sin compilación |
| Recálculo Mapbox sin internet | **No ejecutado**: no hay token público Mapbox configurado para esta prueba |
| FCM/APNs en pantalla bloqueada | **No ejecutado**: faltan configuración/firma y dispositivos habilitados |

El ensayo de la cola usa una base y una clave exclusivas de prueba y las elimina
al concluir; no borra datos de la aplicación. No equivale a recorrer 30 minutos en
modo avión, ni mide batería o temperatura en teléfonos físicos.

Los logs Android quedan en `android/build/krow-native-navigation-assemble.log`
y `android/build/krow-navigation-device-tests.log`; resultados instrumentados en
`android/app/build/outputs/androidTest-results/connected/debug/`.

## Reproducir

Android, desde `android` con el emulador en estado `device`:

```powershell
./gradlew.bat :app:assembleDebug
./gradlew.bat :app:connectedDebugAndroidTest '-Pandroid.testInstrumentationRunnerArguments.class=com.krownmobileapp.runtime.NavigationJournalTest'
```

En macOS, `bash scripts/validate-ios-local.sh` instala pods y compila el simulador
sin firma. El script falla explícitamente fuera de macOS. Un build de simulador
no valida APNs, firma ni el comportamiento de segundo plano en un iPhone real.

Antes de activar: descargar una región con credenciales contratadas; comprobar
voz española, permisos, pantalla bloqueada y reanudación; realizar el desvío de
30 minutos sin datos, pérdida de GPS, región insuficiente, caducidad del token y
cambio de cuenta. Faltan además la ruta compartida reconciliada, acciones chat/
llamada en push y la medición completa del flujo a través de infraestructura.

Referencias: [offline Android](https://docs.mapbox.com/android/navigation/guides/advanced/offline/),
[offline iOS](https://docs.mapbox.com/ios/navigation/guides/advanced/offline/),
[estilos y regiones iOS](https://docs.mapbox.com/ios/maps/guides/offline/manage-offline-data/).
