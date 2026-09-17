# Validación del rediseño UI

## Cobertura implementada

- Tema semántico claro/oscuro con preferencia `system | light | dark`.
- Reducción de movimiento sincronizada con la configuración de accesibilidad.
- Elevación 0–4 consistente entre iOS y Android.
- Componentes v2: Surface, AnimatedPressable, Button, IconButton, Card, Text, Input, StatusBadge, Skeleton, Divider, ScreenContainer, FeedbackState y AnimatedModal.
- Adaptadores retrocompatibles para Button, Card, Input, IconButton y StatusBadge.
- Piloto en Home, viajes recientes, tarjetas de búsqueda y RequestRide.
- Transiciones nativas por flujo y modal animado de detalle.

## Matriz de capturas manuales

Capturar cada estado en iOS y Android, tema claro y oscuro:

| Pantalla | Estados |
| --- | --- |
| Home | carga, error, vacío, con viajes, banner activo, solicitudes pendientes |
| RequestRide | carga, error, vacío, resultados, solicitado, modal de detalle |
| Autenticación | splash, login, registro, teclado visible, validación |
| Viaje | programado, activo, finalizado, cancelado, modal bloqueante |

Nombrar los archivos como `plataforma-tema-pantalla-estado.png`. No se generan automáticamente porque requieren simuladores o dispositivos con sesiones y datos reales.

## Perfilado release

1. Compilar una variante release sin el inspector remoto.
2. Medir Home y RequestRide a 60 Hz y, si está disponible, 120 Hz.
3. Registrar FPS de UI/JS, commits React, tiempo de navegación y apertura de modal.
4. Probar listas de 50 viajes, refresh continuo, red lenta, teclado y mapas.
5. Aceptar cuando no existan congelamientos sostenidos ni tareas largas introducidas por presentación.

## Accesibilidad

- Comprobar VoiceOver y TalkBack, orden de foco y etiquetas de acciones.
- Activar “Reducir movimiento”: no debe haber escala, desplazamiento ni skeleton pulsante.
- Probar texto ampliado y contrastes de contenido/control conforme a WCAG AA.
