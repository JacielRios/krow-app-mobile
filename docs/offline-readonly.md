# Consulta parcial sin conexión

La app conserva React Query, la API NestJS y Keychain/Keystore. No incorpora una nueva librería ni una cola de escrituras del piloto.

## Información disponible

- Perfil previamente consultado, asociado a una sesión local existente.
- Primera página de `Tus viajes`: hasta 30 resúmenes por rol y grupo (próximos, en curso e historial).
- Datos guardados durante un máximo de 24 horas para lectura. El límite de tamaño por registro es 48.000 caracteres; las copias mayores no se persisten.

El espacio de almacenamiento incluye la URL de API, la cuenta y la consulta. Solo se guardan campos explícitos del perfil y de los resúmenes; no se persisten tokens, chat, GPS, rutas operativas ni detalles de pasajeros mediante este mecanismo. Las copias de negocio se almacenan con la protección nativa de Keychain/Keystore y sin respaldo en AsyncStorage.

## Comportamiento

Primero se intenta obtener la respuesta del servidor. Solo una pérdida de conexión con la API (código de cliente 0) o un timeout (408) permite recuperar la copia protegida. Puede ser necesario esperar el timeout antes de mostrarla; no es una hidratación inmediata de toda la app. HTTP 401/403 borra las copias de esa cuenta; otros errores HTTP y cancelaciones se muestran sin recuperar la copia del disco.

Los resúmenes recuperados indican su fecha y advierten que el estado puede haber cambiado. No abren detalles ni pantallas operativas mientras la lista o el perfil proceden de una copia. Un perfil recuperado nunca concede habilitación para publicar. La pantalla conserva su diseño y componentes actuales.

Mientras se usa una vista recuperada, se consulta de nuevo cada 15 segundos en primer plano. Se revalida también al volver a la app y existe actualización manual. Una respuesta válida reemplaza el conjunto guardado con el estado del servidor: no se fusionan cambios locales ni se repiten escrituras. La paginación adicional requiere conexión.

La sesión sigue gestionada por Supabase. Este trabajo no habilita iniciar sesión sin conexión ni recuperar una sesión vencida que necesite renovación remota. Una escritura local fallida no interrumpe una consulta online correcta, pero no crea una copia alternativa sin protección. Si no hay una copia válida o falla su lectura, la consulta offline conserva el flujo de error/reintento.

## Consistencia y privacidad

`apiRequest.expectedActorId` vincula estas lecturas a la cuenta de la sesión y nunca se envía como campo HTTP. Evita guardar una respuesta de otra cuenta tras un cambio de sesión. Cerrar sesión o cambiar de cuenta cancela la validez de operaciones de caché pendientes y borra las copias de la cuenta anterior; una respuesta tardía no las recrea.

Crear o aceptar una reserva, publicar/editar un viaje, cobrar, cancelar, enviar chat o cambiar estados sigue requiriendo confirmación del backend. No hay sincronización de escrituras offline y, por tanto, tampoco conflictos de escritura local/remota que resolver. La idempotencia de publicación de la etapa anterior sigue siendo independiente.

## Verificación y límites

La batería móvil completa aprobó **237 pruebas en 38 suites**; TypeScript y ESLint aprobaron. Las pruebas nuevas cubren recuperación con caché de memoria nueva y recarga de módulos, aislamiento de cuenta/consulta, caducidad, corrupción, fallos de almacenamiento, autorización denegada, respuesta tardía tras logout, sustitución al reconectar y bloqueo de navegación basada en copias. El almacenamiento nativo se simula en Jest; falta verificar modo avión y recuperación en un Android real.

Esta entrega avanza la actividad 6 con consulta parcial. No acredita navegación offline, mapas descargados, GPS continuo ni todas las pantallas accesibles sin conexión.
