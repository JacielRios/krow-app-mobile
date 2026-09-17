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

---

# 📦 Instalación

```bash
git clone <repo-url>
cd krow
npm install
npm run dev
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

---

# 🤝 Contribución

Proyecto en desarrollo activo.
Se recomienda mantener una estructura modular para facilitar el trabajo en equipo.

---

# 📌 Nota

KROW no busca ser un Uber, sino una solución práctica para estudiantes que comparten rutas similares y quieren reducir costos de transporte.

---
