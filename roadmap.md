# Roadmap Técnico — Atlas Spaces
### Prueba Técnica Full Stack — Quantum Infinity Technologies S.A.S.

**Estado:** v3 — recortado. Menos formato de RFC, mismas decisiones.

---

## Principios que sigo en este proyecto

- Diseñar para crecer, implementar para el presente. No construyo lo que el problema actual no pide.
- El backend es la fuente de verdad de las reglas de negocio. El frontend valida por UX, no porque sea seguro confiar en eso.
- Prefiero código que pueda explicar línea por línea a código que "se ve terminado".
- Cada regla no definida en el brief se documenta como supuesto en el README, no se deja implícita.

---

## 1. Negocio

Atlas Spaces administra varias sedes de coworking con espacios reservables por franja horaria. Es una herramienta **interna** de operación, no autoservicio para clientes. Por eso:

- Auth simple (login + JWT), sin OAuth ni 2FA — no hay registro público ni recuperación de contraseña.
- El "cliente" de una reserva es solo un dato (nombre + correo) dentro de la reserva, no un usuario del sistema.

**Actores:**

| Actor | Puede | No puede |
|---|---|---|
| Administrador | Gestionar espacios, CRUD completo de reservas, dashboard, export | — |
| Operador | Solo consultar espacios, CRUD de reservas, dashboard, export | Crear/editar/desactivar espacios |

Dos roles fijos → un enum + un middleware de guard es suficiente. No hay caso para RBAC configurable aquí.

---

## 2. Reglas de negocio (Ticket 4)

1. No se permiten dos reservas superpuestas en el mismo espacio en estado `pendiente` o `confirmado`.
2. `cancelado` y `completado` no bloquean horario.
3. Reservas consecutivas son válidas (`fin(A) == inicio(B)` no es conflicto → comparación con `<`/`>`, no `<=`/`>=`).
4. `inicio < fin`. `0 < asistentes ≤ capacidad`. Dentro de horario del espacio (`America/Bogota`).
5. No se crean reservas en fechas pasadas (frontend y backend).
6. Al editar, se revalida todo excluyendo la propia reserva.
7. Conflicto → `409 Conflict` con mensaje claro.

**Supuesto que documento (no pregunto, el brief lo marca como intencionalmente ambiguo):** desactivar un espacio no cancela sus reservas futuras, solo bloquea reservas nuevas sobre ese espacio.

**Algo que el brief no menciona pero vale la pena resolver bien:** dos requests casi simultáneas para el mismo horario podrían pasar la validación de solapamiento antes de que cualquiera inserte (race condition clásica de "check-then-write"). Para esto lo más simple y suficiente es envolver el check + insert en una transacción de Mongo (necesita replica set de un solo nodo, trivial en el compose). Si prefieres no meter esa pieza extra por ahora, lo dejamos documentado como limitación conocida — dime cuál prefieres y seguimos.

---

## 3. Casos de uso

Login/logout · CRUD espacios (admin) / listado (operador) · CRUD + cancelación de reservas · listado paginado con filtros y orden · dashboard por rango de fechas · export CSV con los mismos filtros del listado.

---

## 4. Arquitectura

Monolito modular: `/backend` + `/frontend` desacoplados, Mongo, Docker Compose. Nada de microservicios ni GraphQL — con 3 entidades y tráfico interno bajo, sería complejidad sin beneficio.

Backend organizado **por dominio**, no por capa técnica:

```
atlas-spaces/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/          # User, Space, Reservation
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── spaces/
│   │   │   ├── reservations/
│   │   │   ├── dashboard/    # sin modelo propio, agrega sobre reservations
│   │   │   └── export/       # reutiliza el query builder de reservations
│   │   ├── middlewares/     # requireAuth, roleGuard, errorHandler, validate
│   │   ├── utils/           # timezone, http errors
│   │   ├── seed/
│   │   └── app.js / server.js
│   ├── tests/
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── features/        # auth, spaces, reservations, dashboard
│   │   ├── components/
│   │   ├── routes/
│   │   ├── context/          # AuthContext
│   │   └── App.jsx
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── README.md
└── IA.md
```

Dentro de cada módulo backend: `routes → controller → service → model`. La lógica de negocio vive en el service, no en el controller, para poder testearla sin levantar Express.

`dashboard` y `export` no tienen modelo propio — son vistas sobre `reservations`, no entidades nuevas.

---

## 5. Modelo de datos

**User:** name, email (único, indexado), passwordHash (bcrypt), role (`admin`/`operator`), active, timestamps.

**Space:** name, type, location (sede), capacity, openTime/closeTime (`"HH:mm"`), active, timestamps.

**Reservation:** space (ref), title, clientName/clientEmail, attendees, startAt/endAt (Date, UTC), status (`pending`/`confirmed`/`cancelled`/`completed`), notes, createdBy (ref User, para auditoría), timestamps.

Índice compuesto `Reservation({space, startAt, endAt})` para la query de solapamiento y los filtros de rango. `User.email` único. `Space.active` para listados operativos.

**Fechas:** todo se guarda en UTC, se interpreta en `America/Bogota` solo en frontend y en la validación de horario del espacio (helper centralizado, para no repetir la conversión en cada service). Guardar hora local como string rompería cualquier filtro de rango en el backend.

---

## 6. Auth y permisos

Login con email+password → bcrypt → JWT (`sub`, `role`, `exp`). Token en `localStorage` solo para la sesión, no para datos de negocio. `requireAuth` valida el token (401 si falta/expiró/es inválido). `requireRole('admin')` protege espacios (403 si el rol no coincide). El frontend oculta UI admin para el operador, pero el permiso real siempre lo decide el backend.

Sin refresh token en el MVP — un JWT de 8h alcanza para uso diario interno. Queda como mejora futura si se quiere.

---

## 7. Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/spaces                 (admin, operator)
POST   /api/spaces                 (admin)
PUT    /api/spaces/:id             (admin)
PATCH  /api/spaces/:id/deactivate  (admin)

GET    /api/reservations           ?page&limit&status&spaceId&from&to&search&sortBy&sortOrder
POST   /api/reservations
GET    /api/reservations/:id
PUT    /api/reservations/:id
PATCH  /api/reservations/:id/cancel

GET    /api/dashboard/summary      ?from&to
GET    /api/dashboard/by-day       ?from&to
GET    /api/dashboard/by-status    ?from&to
GET    /api/dashboard/by-space     ?from&to

GET    /api/reservations/export    ?status&spaceId&from&to&search
GET    /api/health
```

Se documenta con Postman/OpenAPI durante la implementación.

---

## 8. Navegación (frontend)

`/login → /dashboard (default) → /spaces (admin CRUD / operador lectura) → /reservations (lista) → /reservations/:id (detalle/edición)`, más modal de nueva reserva. Cada vista de datos maneja `loading`, `error`, `empty`, y confirma antes de acciones destructivas.

---

## 9. Recomendaciones extra (tu decides cuáles entran)

R�pidas de justificar, no las doy por aprobadas:

- **Formato de error uniforme** (`{error: {code, message}}`) en vez de mensajes sueltos por endpoint.
- **Validación de inputs con una librería de esquemas** (Zod) en vez de checks manuales dispersos.
- **Rate limiting en `/auth/login`** contra fuerza bruta.
- **Health check que también valida conexión a Mongo**, no solo "el server responde".

Todas son bajo costo. Dime cuáles quieres y seguimos; si no dices nada, asumo que ninguna entra al alcance mínimo y las anoto como mejora futura.

---

## 10. Orden de implementación

El diseño no cambia por el plazo; el orden de construcción sí se prioriza por dependencias y riesgo:

1. Modelos + conexión + seed + `/api/health`
2. Ticket 1 — Auth (bloquea todo lo demás)
3. Ticket 2 — Espacios y Reservas (CRUD + filtros/paginación)
4. Ticket 4 — Reglas de negocio sobre el CRUD ya existente
5. Ticket 3 — Dashboard (necesita reservas reales con estados variados)
6. Ticket 5 — Export CSV (reutiliza el query builder de reservations)
7. Ticket 6 — Docker
8. README, IA.md, Postman/OpenAPI, video

Las recomendaciones de la sección 9 se evalúan después de cubrir los 6 tickets obligatorios.

---

## 11. Pruebas

Jest + Supertest, contra Mongo real o `mongodb-memory-server` (no mocks — el riesgo está en la query de solapamiento real):
1. Auth: acceso válido + rechazo sin token/rol incorrecto.
2. Reserva superpuesta → rechazada.
3. Reservas consecutivas → permitidas.
4. Validación de capacidad/horario/fechas → rechazada.

---

## 12. Despliegue

Solo local: `docker compose up --build` levanta frontend + backend + Mongo con volumen persistente. README con alternativa sin Docker. Sin CI/CD ni cloud — fuera de alcance.

---

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| Timezone mal manejado | UTC en BD, conversión centralizada en un helper |
| Race condition en solapamiento | Ver sección 2 — pendiente tu decisión |
| Filtros divergen entre listado y export | Mismo query builder para ambos |
| Validación solo en frontend | Toda regla vive primero en el backend |

---

## 14. Fuera de alcance (documentado, no implementado)

Refresh tokens, CI, a11y, tests de frontend, Swagger interactivo, normalizar `location` a colección `Site` propia, auditoría de cambios.

---

## Decisiones aprobadas (24 jul)

1. **Race condition en solapamiento:** aprobado. Se implementa con transacción de Mongo sobre replica set de un solo nodo (configuración en `docker-compose.yml`, sin costo real adicional).
2. **Recomendaciones de la sección 9:** las cuatro entran al alcance (formato de error estandarizado, validación con Zod, rate limiting en login, health check que valida Mongo). Si alguna llega a poner en riesgo un ticket obligatorio, se pausa y se documenta como pendiente — los 6 tickets tienen prioridad sobre estas mejoras.

**Regla de trabajo para el resto del proyecto:** cualquier decisión arquitectónica no trivial que aparezca durante la implementación se presenta primero con alternativas y una recomendación, antes de escribir código. No se decide en silencio.

→ Arrancamos Fase 1: modelos, conexión a Mongo (replica set de un nodo), seed, health check.
