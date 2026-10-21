# APK privado de cumplimiento 0.5.1

Fecha: 20 de octubre de 2026. Versión `0.5.1-trial`, código 8.

El APK incluye persistencia del identificador de publicación por cuenta y actualización de listas. Conserva el diseño y las dependencias actuales. Se compiló con ARM64 y ARMv7, JavaScript Hermes integrado, firma de prueba existente y HTTP sin cifrar desactivado.

Archivo: `artifacts/android/krow-0.5.1-trial.apk`. La [evidencia del APK](android-apk-0.5.1-20261020.json) registra su SHA-256 y las verificaciones de firma, versión y contenido.

**Instalación retenida hasta actualizar la API.** Las dos migraciones ya se aplicaron en Supabase, pero Railway rechazó dos intentos de despliegue con `Deploys have been paused temporarily`. La API anterior sigue operativa y rechaza el nuevo campo `requestId`; instalar este cliente antes del despliegue impediría publicar viajes.

El build aprobó. La batería móvil previa aprobó 208 pruebas en 35 suites; no se ejecutaron pruebas físicas. ADB no detectó dispositivos. Firma correcta, bundle y compilación no certifican GPS, navegación nativa ni funcionamiento integral en teléfonos.

Después del despliegue de API: comprobar el nuevo contrato HTTP; instalar como actualización del paquete existente; verificar reintento de publicación, listados de viajes y rechazo de reservas vencidas; realizar el recorrido GPS con dos dispositivos y registrar diagnósticos y resultados.
