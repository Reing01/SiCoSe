# SiCoSe — Sistema de Cobro y Seguimiento

SiCoSe es un monorepo para digitalizar la recaudación, el control de adeudos y la trazabilidad operativa de una Junta Auxiliar.

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js 20 + Express 5 + Prisma ORM
- Datos: PostgreSQL 16 + Redis 7
- Seguridad: JWT, bcrypt, Helmet, rate limiting y blacklist de tokens en Redis
- Documentación: Swagger UI en `/api/docs`

## Estructura

- `frontend/` aplicación web
- `backend/` API, servicios y Prisma
- `Docs/` evidencias, guías y contexto del proyecto
- `docker-compose.yml` entorno local con PostgreSQL y Redis
- `swarm/` despliegue multi-máquina con Docker Swarm y routing mesh

## Instalación

```bash
npm ci
npm ci --prefix frontend
npm ci --prefix backend
```

## Desarrollo

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Pruebas y build

```bash
npm test
npm run build
```

## API

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`

## Docker para desarrollo

```bash
docker compose up -d
```

Levantará PostgreSQL 16 y Redis 7 con volúmenes persistentes y variables de entorno separadas en `.env.docker`.

Para una práctica multi-máquina de 4 nodos con Docker Swarm y routing mesh:

```bash
npm run deploy:cluster:4nodos
```

La guía completa está en `Docs/practica-cluster-4-nodos.md`.

### Credenciales de prueba

Si ya corriste el seed del backend, puedes entrar con cualquiera de estas cuentas:

- `admin@sicose.test`
- `tesorero@sicose.test`
- `secretaria@sicose.test`

Contraseña para las tres: `SiCoSe2026!`

Para cargar los datos de prueba en local:

```bash
npm run seed --prefix backend
```

## Ramas

- `main`: producción
- `develop`: integración
- `feature/*`, `fix/*`, `docs/*`, `chore/*`: trabajo puntual por issue

## CI

El workflow de GitHub Actions valida `lint`, `test` y `build` en frontend y backend para cada PR hacia `main` y `develop`.

## Documentación adicional

- `Docs/deploy-guia.md`
- `Docs/practica-cluster-4-nodos.md`
- `Docs/Flujo del Sistema-Act5.md`
- `Docs/Gitthub-flow.md`
- `Docs/ModelodeDatos-Act5.md`
