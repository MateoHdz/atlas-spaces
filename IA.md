# 🤖 Uso de Inteligencia Artificial (IA.md)

Este documento detalla con transparencia el criterio técnico, la colaboración y el control con el que se utilizaron las herramientas de inteligencia artificial durante el desarrollo del proyecto **Atlas Spaces**.

---

## 🛠️ 1. Herramientas de IA Utilizadas

- **Antigravity AI (Google DeepMind):** Asistente principal para pares de programación, verificación de arquitectura y automatización de comandos/tests.
- **Claude 3.5 Sonnet / Gemini Flash:** Modelos de razonamiento utilizados para análisis de código, diseño de esquemas Zod y generación de pipelines de agregación de MongoDB.

---

## 🎯 2. Tareas Concretas en las que se Utilizó IA

1. **Planificación y Roadmap:** Estructuración del plan de desarrollo incremental fase por fase a partir del brief técnico y requerimientos del PDF.
2. **Generación de Boilerplate:** Creación de esquemas Zod (`spaces.schema.js`, `reservations.schema.js`, `dashboard.schema.js`) y utilidades de formato.
3. **Escritura de Pruebas de Integración:** Generación de estructuras de prueba con Jest y `mongodb-memory-server` para casos de borde (solapamiento, horario operativo, capacidad).
4. **Diseño de Componentes Frontend:** Componentes React con Tailwind CSS (formularios, tablas paginadas, modales y gráficos con Recharts).

---

## 🧠 3. Cómo se Proporcionó el Contexto Necesario

Para obtener respuestas precisas y alineadas con la arquitectura profesional solicitada:
- Se adjuntaron directamente el documento **PDF del brief** y el **Roadmap técnico oficial** en cada sesión.
- Se impusieron restricciones estrictas de diseño: arquitectura monolítica modular por dominio (`routes -> controller -> service -> model`), bajo acoplamiento, cero parches y no avanzar a una nueva fase sin haber completado y probado la anterior.
- Se proporcionaron tracebacks exactos de errores en lugar de descripciones generales cuando ocurrió algún fallo en la compilación o en los tests.

---

## ❌ 4. Respuestas / Sugerencias de IA Descartadas o Corregidas

### Caso 1: Validación de Solapamiento en Memoria vs. Transacción Atómica de Mongo
- **Sugerencia inicial de la IA:** La IA sugirió realizar una consulta `Reservation.find(...)` en el service y validar los rangos de fechas mediante código JavaScript en Node.js sin bloqueo de base de datos.
- **Motivo de rechazo/corrección:** Este enfoque dejaba abierta una condición de carrera (*race condition*) si dos peticiones concurrentes intentaban reservar la misma sala exactamente al mismo milisegundo. Se corrigió forzando el uso de **transacciones nativas de MongoDB** (`session.withTransaction()`) sobre un ReplicaSet, garantizando aislamiento y respuesta `409 Conflict` atómica.

### Caso 2: Manejo de Zona Horaria en Exportación CSV
- **Sugerencia inicial de la IA:** Exportar las fechas de inicio y fin en formato ISO UTC crudo (`2026-08-01T14:00:00.000Z`).
- **Motivo de rechazo/corrección:** El brief exige operabilidad en la zona horaria `America/Bogota`. Se refactorizó agregando el helper `toLocalDateTimeString()` en `utils/timezone.js` y anteponiendo el **BOM UTF-8 (`\uFEFF`)** al archivo CSV para que Excel en Windows muestre la hora colombiana y los acentos correctamente de forma transparente.

---

## 🔍 5. Cambios y Validaciones Realizadas Manualmente

- **Refactorización del middleware errorHandler:** Se añadió manualmente el manejo del error `CastError` de Mongoose para devolver un HTTP 400 limpio con código `INVALID_ID` cuando un parámetro `:id` no posee un formato ObjectId válido.
- **Ajuste de Zod chaining:** Se corrigió el orden de encadenamiento entre `.extend()` y `.refine()` en `reservations.schema.js`, ya que `.refine()` genera una instancia de `ZodEffects` que no expone `.extend()`.

---

## ✅ 6. Comprobación de Funcionalidad, Seguridad y Coherencia

- **Suite de Pruebas Automatizadas:** Se ejecutó de forma continua la suite de 47 pruebas en Jest, garantizando que ninguna nueva característica rompiera los componentes anteriores (100% de tasa de éxito).
- **Verificación de Seguridad:** Se comprobó manualmente que rutas protegidas como `POST /api/spaces` retornen `401 Unauthorized` ante solicitudes anónimas y `403 Forbidden` cuando son consumidas por un token con rol `operator`.
- **Integración Docker:** Se validó que `docker-compose.yml` construya los contenedores de frontend, backend y base de datos con comunicación directa y persista los datos en volúmenes.

---

## 🏛️ 7. Decisión Técnica No Delegada a la IA y su Razón

**Decisión:** **La adopción de MongoDB ReplicaSet de 1 solo nodo para desarrollo local y Docker.**
- **Razón:** Mongoose inhabilita las transacciones (`startSession()`) si se conecta a un servidor de MongoDB standalone convencional. En lugar de cambiar la arquitectura a transacciones en dos fases o desactivar la regla de solapamiento atómico, se tomó la decisión arquitectónica de configurar la imagen de MongoDB con `--replSet rs0` en `docker-compose.yml` y en `mongodb-memory-server` durante las pruebas. Esta decisión garantizó que el entorno de desarrollo sea 100% idéntico a un entorno de producción.
