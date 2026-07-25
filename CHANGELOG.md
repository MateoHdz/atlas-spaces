# Changelog de trabajo

Bitácora de lo construido, en formato de mensajes de commit. Úsala como guía al hacer tus commits/push reales — cada bullet es, en la práctica, un commit atómico y explicable por sí solo.

## Fase 1 — Base del proyecto

- `feat(config): validación centralizada de variables de entorno al arrancar`
- `feat(models): esquemas de User, Space, Reservation con índices`
- `feat(db): conexión a MongoDB vía replica set (soporte de transacciones)`
- `feat(seed): script de datos iniciales — 2 usuarios, 5 espacios, 20 reservas`
- `feat(health): endpoint GET /api/health que valida conexión real a Mongo`
- `feat(errors): formato de error HTTP estandarizado + HttpError`
- `feat(utils): helper centralizado de timezone (UTC ↔ America/Bogota)`
- `chore(compose): mongo con replica set de un nodo para desarrollo local`
- `docs(readme): decisiones técnicas de la fase 1`

## Fase 2 — Ticket 1: Autenticación y autorización

- `feat(auth): login con bcrypt + JWT`
- `feat(auth): endpoints POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me`
- `feat(middleware): requireAuth y requireRole para proteger rutas por rol`
- `feat(middleware): validación de entrada centralizada con Zod`
- `feat(middleware): rate limiting en /api/auth/login`
- `fix(models): eliminar índice duplicado en User.email`
- `test(auth): casos de acceso protegido y autorización por rol (403 para operador en ruta admin)`

---

**Sugerencia de squash/orden al pushear:** puedes respetar este orden fase por fase (Fase 1 primero, Fase 2 después) para que el historial de GitHub cuente la misma historia que este documento. Si prefieres commits más finos que los bullets de arriba, cada archivo nuevo dentro de un bullet es también un buen punto de corte natural.
