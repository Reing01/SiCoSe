# Reproducir la CI localmente

La pipeline de `.github/workflows/ci.yml` corre en Node.js 20.18.0 y usa
pnpm 9.15.5. Hay lockfiles independientes para `frontend` y `backend`; por
eso las instalaciones se ejecutan por servicio y siempre con
`--frozen-lockfile`.

## Requisitos

- Node.js 20.18.0 (Corepack habilitado) y pnpm 9.15.5.
- Docker Engine con Docker Compose v2 para las validaciones de contenedores.
- Helm 3 para validar el chart de Kubernetes.

```bash
corepack enable
corepack prepare pnpm@9.15.5 --activate
pnpm --dir frontend install --frozen-lockfile
pnpm --dir backend install --frozen-lockfile
```

## Calidad, pruebas y build

Ejecuta los mismos comandos que los jobs matriciales de CI:

```bash
pnpm --dir frontend run lint
pnpm --dir backend run lint

pnpm --dir frontend run test
pnpm --dir backend run test

pnpm --dir frontend run build
pnpm --dir backend run build
```

Las pruebas de frontend incluyen login, dashboard y gestión de ciudadanos.
Las pruebas de backend incluyen autorización, `dashboard` y `ciudadanos`.
El flujo E2E de `frontend/e2e/auth-flow.spec.ts` cubre login y dashboard;
para correrlo localmente (no forma parte del job unitario) usa:

```bash
pnpm --dir frontend exec playwright install --with-deps
pnpm --dir frontend run test:e2e
```

## Docker Compose e imagen de producción

No uses un archivo `.env` real en estas comprobaciones. Compose lee
`.env.docker` directamente; si aún no tienes uno local, créalo desde la
plantilla segura (no sobrescribas un archivo existente):

```bash
cp .env.docker.example .env.docker
docker build -f Dockerfile -t sicose:ci .
docker compose config --quiet
docker compose build
```

## Helm

El repositorio contiene un chart real en `helm/sicose`. Compruébalo con los
values por defecto:

```bash
helm lint ./helm/sicose
helm template sicose ./helm/sicose --namespace sicose --debug > sicose-manifest.yaml
```

## Protección de ramas

GitHub no permite declarar required checks desde el workflow. En la
protección de ramas de `main` y `develop`, configura como requeridos los
checks: `Lint (frontend)`, `Lint (backend)`, `Test (frontend)`,
`Test (backend)`, `Build (frontend)`, `Build (backend)`, `Docker` y `Helm`.
Exige además que la rama esté actualizada antes del merge y al menos una
aprobación de PR, según `Contributing.md`.
