# Atlas Spaces

Plataforma interna de gestión de espacios y reservas para una empresa de coworking.
Prueba técnica Full Stack — Quantum Infinity Technologies S.A.S.

> Este README se construye por fases, junto con el código. Esta sección cubre lo hecho hasta la Fase 1 (base del backend). Se completa con instalación, endpoints, etc. en fases siguientes.

## Decisiones técnicas — Fase 1

### Transacciones en la creación de reservas (replica set de un solo nodo)
La regla de negocio central es que nunca existan dos reservas superpuestas para el mismo espacio. Sin transacción, el flujo "verificar solapamiento → insertar" tiene una ventana de carrera: dos requests casi simultáneas podrían pasar la validación antes de que cualquiera escriba. MongoDB solo soporta transacciones sobre un replica set (aunque sea de un solo nodo), por eso `MONGO_URI` exige `?replicaSet=rs0` y el `docker-compose.yml` levanta Mongo con `--replSet rs0`. Costo de configuración: una línea de comando. A cambio, la regla de negocio #1 queda garantizada por diseño, no por suerte de baja concurrencia.

### Fechas en UTC, interpretadas en `America/Bogota` solo en la frontera
Todo se persiste en UTC (comportamiento nativo de `Date` en Mongo/Node). La alternativa — guardar hora local como string — rompe cualquier query de rango en el backend (filtros `from`/`to`, agregaciones del dashboard), porque comparar strings de fecha no es comparar fechas reales. La conversión a hora de Bogotá vive en un único lugar (`src/utils/timezone.js`), consumido por la validación de horario de apertura/cierre del espacio y (más adelante) por el frontend. Un solo punto de conversión evita que cada módulo reinvente — o se olvide de— la conversión de zona horaria.

### Índices de MongoDB
- `Reservation({space, startAt, endAt})` compuesto: es el índice que soporta tanto la búsqueda de solapamiento (filtra por espacio + rango de fechas) como los filtros `from`/`to` del listado, dashboard y export. Sin él, esas queries escanean la colección completa a medida que crece.
- `Reservation({status})`: soporta el filtro por estado del listado y las agregaciones del dashboard por estado.
- `User({email}, {unique: true})`: garantiza correo único a nivel de base de datos, no solo a nivel de aplicación (una validación solo en el service no protege contra inserciones concurrentes).
- `Space({active})`: los listados operativos casi siempre filtran espacios activos; sin índice, ese filtro también sería un escaneo completo.

### Estructura de configuración (`src/config/env.js`)
Todas las variables de entorno se leen y validan en un único módulo al arrancar la app, no dispersas con `process.env.X` por todo el código. Dos beneficios concretos: (1) si falta una variable requerida como `JWT_SECRET`, la app falla inmediatamente al iniciar con un mensaje claro, en vez de fallar más tarde de forma confusa a mitad de un request; (2) es el único lugar que hay que tocar si cambia una variable, en vez de buscarla por todo el proyecto.

### Formato de error HTTP estandarizado
Todo error de la API responde `{ error: { code, message, details? } }`, centralizado en `src/middlewares/errorHandler.js` y en la clase `HttpError`. Alternativa descartada: mensajes de texto libre por endpoint — funciona al principio, pero el frontend termina con un `if` distinto por cada módulo para interpretar errores. Con un contrato único, el frontend maneja errores una sola vez.

### Health check que valida Mongo, no solo que el proceso responda
`GET /api/health` verifica `mongoose.connection.readyState`, no solo que Express esté escuchando. Un health check que siempre dice "ok" aunque la base de datos esté caída no sirve para nada operativamente — y es justo el tipo de detalle que demuestra si alguien pensó en el endpoint como herramienta real o como checkbox del requerimiento.

## Supuestos y decisiones de producto

- **Espacio desactivado:** no cancela sus reservas futuras existentes, solo bloquea la creación de nuevas reservas sobre ese espacio. No estaba definido en el brief; se documenta aquí como decisión intencional, no como omisión.

## Estado del proyecto

- [x] Fase 1 — Base: modelos, conexión a Mongo (replica set), seed, health check
- [ ] Fase 2 — Ticket 1: Autenticación y autorización
- [ ] Fase 3 — Ticket 2: Gestión de espacios y reservas
- [ ] Fase 4 — Ticket 4: Reglas de negocio y pruebas
- [ ] Fase 5 — Ticket 3: Dashboard y analítica
- [ ] Fase 6 — Ticket 5: Exportación CSV
- [ ] Fase 7 — Ticket 6: Dockerización completa
- [ ] Fase 8 — Documentación final, IA.md, Postman/OpenAPI, video
