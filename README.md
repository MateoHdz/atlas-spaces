# 🏢 Atlas Spaces — Plataforma de Reservas para Espacios de Coworking

![Node.js](https://img.shields.io/badge/Backend-Node.js%2020%20%7C%20Express-brightgreen)
![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TailwindCSS-blue)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%207-green)
![Tests](https://img.shields.io/badge/Tests-47%20passing%20(100%25)-success)
![Docker](https://img.shields.io/badge/Docker-Docker%20Compose-blue)

Atlas Spaces es una plataforma web Full Stack diseñada para administrar sedes de coworking, salas de reuniones, oficinas privadas y auditorios. Permite coordinar reservas en tiempo real, prevenir solapamientos de horario mediante transacciones atómicas, visualizar dashboards analíticos y exportar datos a CSV.

---

## 📐 Arquitectura del Proyecto

El proyecto sigue una arquitectura de **Monolito Modular desacoplado**:

```text
atlas-spaces/
├── package.json              # Orquestador de scripts locales (raíz)
├── backend/                  # REST API en Node.js + Express
│   ├── src/
│   │   ├── config/           # Conexión DB y Env
│   │   ├── models/           # User, Space, Reservation (Mongoose)
│   │   ├── modules/
│   │   │   ├── auth/         # Login, JWT, Roles, RateLimit, Zod
│   │   │   ├── spaces/       # CRUD espacios (solo-admin mutaciones)
│   │   │   ├── reservations/ # CRUD reservas, paginación, filtros y CSV export
│   │   │   ├── dashboard/    # Agregaciones analíticas (Summary, By-Day, By-Status, By-Space)
│   │   │   └── health/       # Health check de servidor y base de datos real
│   │   ├── middlewares/      # requireAuth, requireRole, validate, errorHandler
│   │   ├── utils/            # Timezone (America/Bogota), HttpError
│   │   └── seed/             # Script de datos iniciales
│   ├── tests/                # 47 pruebas de integración (Jest + Supertest)
│   └── Dockerfile
├── frontend/                 # SPA en React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/              # Cliente Axios con interceptor JWT
│   │   ├── context/          # AuthContext (Sesión, User, Roles)
│   │   ├── features/         # auth, spaces, reservations, dashboard
│   │   └── components/       # Layouts, Navbar, Modales y Tablas
│   ├── nginx.conf            # Servidor Nginx para producción
│   └── Dockerfile
├── docker-compose.yml        # Orquestación de MongoDB + Backend + Frontend
├── postman_collection.json   # Colección de prueba para la API
├── README.md
└── IA.md                     # Documentación transparente del uso de IA
```

---

## 🔑 Credenciales de Prueba (Seed)

| Rol | Correo Electrónico | Contraseña | Permisos |
|---|---|---|---|
| **Administrador** | `admin@atlasspaces.com` | `Admin123!` | CRUD completo de espacios, reservas, dashboard y exportación CSV. |
| **Operador** | `operador@atlasspaces.com` | `Operator123!` | Lectura de espacios, CRUD de reservas, dashboard y exportación CSV. |

---

## 🚀 Guía de Ejecución

### Opción A: Ejecución con Docker Compose (Recomendada)

**Requisitos previos:** Docker Desktop instalado y en ejecución.

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/MateoHdz/atlas-spaces.git
   cd atlas-spaces
   ```

2. Levantamiento completo de la aplicación:
   ```bash
   docker compose up --build
   ```

3. Acceder a los servicios:
   - **Frontend App:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:4000/api](http://localhost:4000/api)
   - **Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

4. Cargar datos iniciales (Seed) dentro de los contenedores:
   ```bash
   docker compose exec backend npm run seed
   ```

---

### Opción B: Ejecución Local sin Docker

**Requisitos previos:** Node.js (v18 o v20) y MongoDB (servidor local o Docker en puerto 27017).

> **Nota de compatibilidad:** El backend admite MongoDB local tanto en modo *standalone* estándar como en modo *ReplicaSet* (`rs0`).

#### Método Directo desde la Raíz:
```bash
# 1. Instalar dependencias de backend y frontend
npm run install:all

# 2. Cargar datos iniciales de prueba (seed)
npm run seed

# 3. Iniciar Backend en una terminal (escucha en http://localhost:4000)
npm run dev:backend

# 4. Iniciar Frontend en otra terminal (escucha en http://localhost:5173)
npm run dev:frontend
```

#### Método Tradicional por Subdirectorios:

1. **Configurar e Iniciar Backend:**
   ```bash
   cd backend
   npm install
   npm run seed
   npm run dev
   ```

2. **Iniciar Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 🧪 Pruebas Automatizadas

La solución incluye **47 pruebas de integración** implementadas con Jest, Supertest y `mongodb-memory-server` configurado como **ReplicaSet**:

```bash
# Desde la raíz
npm test

# O desde backend/
cd backend && npm test
```

**Cobertura de pruebas:**
- ✅ **Auth:** Login exitoso, rechazo de credenciales/inactivos, protección de token (401) y guards de rol (403).
- ✅ **Solapamiento:** Demostración de rechazo por cruce de horarios (409 Conflict) y permisión de reservas consecutivas.
- ✅ **Reglas de negocio:** Validación de capacidad, horario operativo (`07:00-20:00`), fechas invertidas y fechas pasadas.
- ✅ **CRUD Espacios & Reservas:** Paginación real backend (`page`, `limit`), filtros dinámicos y orden.
- ✅ **Dashboard:** Métricas analíticas globales, agregación diaria local, por estado y por espacio.
- ✅ **Exportación CSV:** Verificación de descarga con headers HTTP, nombre con fecha (`reservaciones_atlas_spaces_YYYY-MM-DD.csv`) y marca UTF-8 BOM (`\uFEFF`).

---

## 📋 Endpoints de la API REST

```text
POST   /api/auth/login                  # Inicio de sesión
GET    /api/auth/me                     # Perfil del usuario autenticado

GET    /api/spaces                      # Listar espacios (admin: todos, operator: solo activos)
POST   /api/spaces                      # Crear espacio (solo admin)
PUT    /api/spaces/:id                  # Editar espacio (solo admin)
PATCH  /api/spaces/:id/deactivate       # Baja lógica de espacio (solo admin)

GET    /api/reservations                # Listado paginado (?page&limit&status&spaceId&from&to&search&sortBy)
POST   /api/reservations                # Crear reserva (valida solapamiento en transacción)
GET    /api/reservations/:id            # Detalle de reserva
PUT    /api/reservations/:id            # Editar reserva (re-valida reglas en transacción)
PATCH  /api/reservations/:id/cancel     # Cancelar reserva
GET    /api/reservations/export         # Exportar reporte a CSV con los mismos filtros

GET    /api/dashboard/summary           # Métricas globales del periodo (?from&to)
GET    /api/dashboard/by-day            # Agregación diaria (?from&to)
GET    /api/dashboard/by-status         # Distribución por estado (?from&to)
GET    /api/dashboard/by-space          # Uso en horas por espacio (?from&to)

GET    /api/health                      # Healthcheck real (valida estado de conexión MongoDB)
```

---

## 💡 Supuestos y Decisiones Relevantes

1. **Manejo de Transacciones de Concurrencia con Fallback:** La prevención de solapamiento utiliza **transacciones nativas de MongoDB** (`session.withTransaction()`) en ReplicaSet (Docker/Testing) para garantía atómica, integrando un *fallback* automático en desarrollo local cuando MongoDB se ejecuta en modo standalone.
2. **Interpretación de Zona Horaria:** Todas las fechas se persisten en MongoDB en **UTC**. La conversión e interpretación en `America/Bogota` se realiza centralizadamente en `utils/timezone.js` y en la agregación diaria de MongoDB (`$dateToString` con `timezone`).
3. **Exportación CSV en UTF-8 con BOM y Fecha:** El reporte CSV generado incluye el Byte Order Mark (`\uFEFF`) para compatibilidad directa con Microsoft Excel en Windows y un nombre de archivo dinámico con fecha de exportación (`reservaciones_atlas_spaces_YYYY-MM-DD.csv`).

---

## 📝 Limitaciones Conocidas y Mejoras Futuras

- **Refresh Tokens:** Actualmente el JWT tiene una vigencia de 8 horas sin rotación de refresh token (suficiente para la jornada laboral MVP).
- **Swagger UI Interactivo:** La API cuenta con arquitectura REST estándar documentada en este README y en `postman_collection.json`.
- **Normalización de Sedes:** La ubicación/sede se maneja como string descriptivo en el modelo `Space`. Se podría extraer a una colección `Site` para gestión independiente.
