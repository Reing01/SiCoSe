# Guia de despliegue - SiCoSe

Esta guia separa el despliegue del monorepo en dos servicios:

- Backend: Railway
- Frontend: Vercel
- Base de datos y Storage: Supabase
- Cache: Redis compatible con Upstash o Railway Redis

## 1. Backend en Railway

Crear un servicio desde GitHub usando la carpeta:

```text
backend
```

Railway debe usar:

```text
backend/railway.json
```

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run deploy:start
```

Healthcheck:

```text
/health
```

### Variables backend

Configurar en Railway:

```env
PORT=3000
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
JWT_SECRET=
JWT_ISSUER=sicose
JWT_EXPIRES_IN=8h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10
RATE_LIMIT_EMAIL_WINDOW_MS=300000
RATE_LIMIT_EMAIL_MAX=5
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_STORAGE_BUCKET=comprobantes
CORS_ORIGIN=
NODE_ENV=production
```

Notas:

- `DATABASE_URL` debe usar el pooler transaction mode de Supabase.
- `DIRECT_URL` debe usar session/direct mode para migraciones Prisma.
- `SUPABASE_SERVICE_KEY` debe ser la service role key real.
- `REDIS_URL` debe apuntar a Redis real para cache y rate limiting.

## 2. Frontend en Vercel

Crear un proyecto desde GitHub usando la carpeta:

```text
frontend
```

Vercel debe usar:

```text
frontend/vercel.json
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

### Variables frontend

Configurar en Vercel:

```env
VITE_API_BASE_URL=https://URL_DEL_BACKEND_RAILWAY
```

Despues de tener la URL final de Vercel, volver a Railway y actualizar:

```env
CORS_ORIGIN=https://URL_DEL_FRONTEND_VERCEL
```

## 3. Supabase

Antes del primer deploy productivo:

```bash
cd backend
npm run prisma:migrate:deploy
```

El comando tambien corre automaticamente al arrancar el backend con:

```bash
npm run deploy:start
```

Verificar:

- Tablas creadas.
- RLS activo.
- Bucket privado `comprobantes` existente.
- Tipos permitidos: jpg, png, pdf.
- Tamano maximo: 5MB.

## 4. Redis

Para cumplir cache de dashboard y rate limiting:

```env
REDIS_URL=rediss://...
```

Verificacion esperada:

```bash
redis-cli GET dashboard:metricas:YYYY-MM
redis-cli TTL dashboard:metricas:YYYY-MM
```

## 5. Orden recomendado

1. Hacer merge del PR a `develop`.
2. Configurar backend en Railway.
3. Configurar variables backend.
4. Deploy backend.
5. Probar `/health`.
6. Configurar frontend en Vercel.
7. Configurar `VITE_API_BASE_URL`.
8. Deploy frontend.
9. Actualizar `CORS_ORIGIN` en Railway con la URL de Vercel.
10. Probar login, dashboard, pagos y subida de comprobantes.

## 6. Comandos de validacion

Backend:

```bash
cd backend
npm run prisma:migrate:status
npm run lint
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

## 7. Practica multi-máquina de 4 nodos

Si vas a levantar SiCoSe en un clúster de 4 máquinas físicas, usa el perfil de Helm preparado para esa práctica:

```bash
git pull
npm run deploy:cluster:4nodos
```

Referencias:

- `Docs/practica-cluster-4-nodos.md`
- `helm/sicose/values-practica-4-nodos.yaml`
