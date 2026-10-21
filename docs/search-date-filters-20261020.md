# Filtros de fecha y hora para pasajeros

Fecha: 20 de octubre de 2026. Avance local relacionado con la actividad 5.

`RequestRideScreen` permite abrir un filtro opcional de salida desde/hasta, elegir uno o ambos extremos y quitarlo. Reutiliza `RideDateTimePicker`, los botones y el tema existentes. El selector y el resumen usan la hora local del dispositivo; `rideApi` transmite los instantes en ISO UTC mediante el contrato existente `fromTime`/`toTime`.

Se validan fechas inválidas, un extremo final anterior al inicial y rangos que ya terminaron. Cambiar fechas descarta los resultados anteriores e invalida respuestas todavía en vuelo. Refrescar y reintentar conservan el rango. Si el rango vence mientras se consultan resultados, el refresco vuelve al formulario y retira la lista antigua. Quitar el filtro restaura la consulta de próximas salidas.

La API y SQL ya admitían ambos extremos opcionales y límites inclusivos. La búsqueda conserva la selección por destino/paradas publicadas y el orden por cercanía; el filtro no crea recorridos ni disponibilidad. El servidor sigue excluyendo salidas pasadas aunque el inicio indicado haya quedado atrás. No se agregaron dependencias ni migraciones.

## Verificación ejecutada

- Móvil: 217 pruebas aprobadas en 35 suites, incluidas nueve comprobaciones adicionales de flujo/contrato. TypeScript y ESLint de los archivos modificados aprobaron.
- SQL aislado: 14 pruebas aprobadas en la suite de avenidas y búsqueda; dos nuevas verifican extremos opcionales inclusivos, rango invertido y exclusión de viajes vencidos. La geometría es sintética y no certifica mapas reales.
- API publicada: cinco consultas autenticadas aprobadas. El endpoint POST actual responde HTTP 201 para búsquedas válidas y 400 para un rango invertido. Las búsquedas válidas devolvieron listas vacías; esta comprobación acredita compatibilidad del contrato, mientras los escenarios con resultados se probaron en SQL aislado. No se crearon viajes ni reservas.

## Estado de entrega

Los filtros están incluidos en el APK privado 0.5.2-trial y sus pruebas aprobaron; todavía no se validaron visualmente en un teléfono. El APK 0.5.1 corresponde a la etapa anterior.

La pausa de compilaciones de Railway permite continuar con este trabajo local. Sigue pendiente desplegar la API de idempotencia de la etapa anterior antes de instalar el móvil que la utiliza. También quedan pendientes el recorrido GPS físico, recurrencia y los demás compromisos del diagnóstico; esta mejora no completa por sí sola la actividad 5.
