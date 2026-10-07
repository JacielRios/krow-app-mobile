# 🚗 KROW — Carpool para Estudiantes

KROW es una aplicación móvil que permite a estudiantes compartir viajes de forma sencilla, económica y organizada.

La idea es simple:
**si varios van al mismo lugar, pueden ir juntos.**

---

# 🎯 ¿Qué hace KROW?

* Estudiantes pueden publicar viajes
* Otros pueden reservar asientos disponibles
* Pueden comunicarse dentro de la app
* El pago se realiza en efectivo

---

# 🚘 ¿Cómo funciona?

1. Un usuario crea un viaje
2. Otros usuarios lo ven disponible
3. Reservan un asiento
4. Se comunican por chat
5. Realizan el viaje

---

# 🗺️ Funcionalidades principales

* Crear y gestionar viajes
* Reservar asientos
* Definir puntos de subida y bajada
* Visualizar rutas (distancia y tiempo estimado)
* Chat entre usuarios
* Registro de pagos en efectivo

---

# 🛠️ Tecnologías utilizadas

* **Frontend:** React Native
* **Backend:** API NestJS de KROW
* **Infraestructura:** Supabase Auth + PostgreSQL
* Base de datos relacional (PostgreSQL)
* Integración con APIs de mapas

---

# 🚀 Estado del proyecto

🚧 En desarrollo (MVP)

Actualmente incluye:

* Sistema de viajes
* Reservas
* Integración con mapas
* Chat básico
* Registro de pagos

La entrega del piloto online incorpora navegación Inicio/Viajes/Perfil, nuevas
pantallas programadas/activas/históricas, seguimiento GPS Android, chat, efectivo
y reseñas reales bajo flags. Consulta la [guía Android y matriz de aceptación](docs/android-pilot.md)
para configurarlo y revisar lo que falta. Aún no está certificado en dispositivos
ni publicado como piloto. Búsqueda/publicación, favoritas y el mapa activo ya
incorporan el rediseño; el QA visual integral y las pruebas físicas siguen pendientes.

---

# 📦 Instalación

```bash
npm ci
npm start
```

---

# 📱 Ejecución

Asegúrate de tener configurado:

* Entorno de desarrollo para React Native
* Variables de entorno de Supabase
* `KROW_API_URL` apuntando al backend NestJS

La app usa Supabase directamente solo para mantener la sesión y para las
suscripciones Realtime que aún están en migración. Las mutaciones de viajes y
reservas, el matching y las APIs REST de Google Maps pasan por KROW API.

## Mapas y ubicación nativa

La integración de viajes v2 añade navegación Mapbox nativa. Consulta
[implementación y validaciones locales](docs/native-runtime-validation.md) para
las capacidades, requisitos offline y comprobaciones pendientes de iOS.

El pasajero solicita ubicación mientras usa la app y puede escribir el origen
si rechaza el permiso. Android recibe `KROW_ANDROID_MAPS_API_KEY` durante la
compilación desde el entorno o desde `android/local.properties` (archivo local
ignorado por Git). La clave debe tener habilitado Maps SDK for Android y permitir
el paquete `com.krownmobileapp` con el SHA-1 del certificado usado para firmar.
Después de cambiarla hay que recompilar e instalar Android; reiniciar Metro no basta.
Solo la variante debug admite la antigua `GOOGLE_MAPS_API_KEY` del `.env` móvil
cuando no hay clave nativa explícita. Release exige la clave Android propia y falla
si no está configurada. No distribuir la clave REST del backend como clave nativa.
Para iOS, instala los pods y pasa
`KROW_IOS_MAPS_API_KEY=<clave restringida al bundle>` a `xcodebuild` o defínela
como build setting del esquema; ambos sistemas renderizan Google Maps.

---

# 🤝 Contribución

Proyecto en desarrollo activo.
Se recomienda mantener una estructura modular para facilitar el trabajo en equipo.

---

# 📌 Nota

KROW no busca ser un Uber, sino una solución práctica para estudiantes que comparten rutas similares y quieren reducir costos de transporte.

---
