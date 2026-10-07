# Clave de Google Maps para el APK privado

La configuración recomendada usa una clave del backend en Railway y otra para
el mapa nativo Android, con su restricción de aplicación.
[Recomendaciones de Google](https://developers.google.com/maps/api-security-best-practices).

Para este APK privado, el usuario autorizó el 6 de octubre de 2026 usar
temporalmente la misma clave que el backend. Ya está guardada en
`android/local.properties`, ignorado por Git; se incorpora al APK al compilar.
Los pasos siguientes preparan la separación para una distribución posterior.

1. Abrir [Credenciales de Google Cloud](https://console.cloud.google.com/apis/credentials)
   y seleccionar el mismo proyecto de Google Maps.
2. Comprobar que **Maps SDK for Android** esté habilitado en la biblioteca de APIs.
3. Crear una clave nueva, por ejemplo `KROW Android prueba`.
4. En sus restricciones de aplicación, elegir **Aplicaciones Android** y añadir:
   - Paquete: `com.krownmobileapp`.
   - SHA-1 de la firma de prueba:
     `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
5. En las restricciones de API, permitir **Maps SDK for Android**. Guardar la
   clave únicamente en el archivo local ignorado `android/local.properties`:

   ```properties
   KROW_ANDROID_MAPS_API_KEY=<clave Android>
   ```

La clave Android se incorpora a los recursos nativos al compilar. La restricción
de paquete y certificado limita su uso a esta firma. Cuando se prepare una firma
productiva, tendrá su propia huella y configuración.

La configuración pública `.env.trial` ya apunta a la API Railway y a Supabase.
Los flags de piloto/GPS deben coincidir con los verificados en el servidor.
Para empaquetar, desde la raíz:

```powershell
.\scripts\build-android-trial.ps1
```

El APK ya está en `artifacts/android/krow-trial.apk`, con firma y bundle verificados.
No necesita Metro ni el servidor local. Los mapas y el GPS requieren además
comprobación en un dispositivo; compilar no demuestra que Maps SDK for Android
esté habilitado para la clave utilizada.
