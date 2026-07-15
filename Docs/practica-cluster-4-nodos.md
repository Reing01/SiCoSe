# Práctica de clúster de 4 nodos - SiCoSe

Este perfil prepara SiCoSe para una práctica multi-máquina con Docker + Kubernetes vía Helm.

Las imágenes se publican automáticamente en GHCR cuando se hace `push` a `main`:

- `ghcr.io/reing01/sicose-backend`
- `ghcr.io/reing01/sicose-frontend`

## Objetivo

- 4 máquinas físicas
- 1 nodo principal para control y despliegue
- 3 nodos de trabajo para distribución de carga
- 12 réplicas totales para `backend` y `frontend`
- 3 réplicas por máquina, distribuidas por el orquestador con `topologySpreadConstraints`

## Qué resuelve

- Balanceo de carga entre nodos
- Reubicación automática de pods cuando un nodo falla
- Despliegue repetible desde Git
- Un solo comando para levantar o actualizar el entorno
- Distribución estricta de pods por hostname en el perfil de práctica

## Comando de despliegue

Desde el nodo principal:

```bash
git pull
npm run deploy:cluster:4nodos
```

Ese comando aplica el release de Helm con:

- `backend` en 12 réplicas
- `frontend` en 12 réplicas
- autoscaling desactivado para que la práctica sea estable
- `PodDisruptionBudget` reforzado
- `imagePullPolicy: Always` para tomar la versión más reciente de `main`
- `topologySpreadConstraints` estrictas para evitar sobrecarga de un mismo nodo

## Notas operativas

- Las 4 máquinas deben estar unidas al mismo clúster de Kubernetes.
- El nodo principal puede quedar como control plane y punto de despliegue.
- Las imágenes de `backend` y `frontend` deben estar disponibles para el clúster, ya sea en un registry compartido, en GHCR público o pre-cargadas en los nodos.
- Si el registry es privado, el chart ya soporta `imagePullSecrets`.
- La comunicación entre servicios se hace por `Service`, así que las réplicas se descubren automáticamente dentro del clúster.
- Si quieres afinar aún más la colocación, el chart acepta `nodeSelector`, `tolerations` y `affinity` por componente.

Ejemplo de `imagePullSecret` si usas un registry privado:

```bash
kubectl create secret docker-registry ghcr-secret \
  --namespace sicose-prod \
  --docker-server=ghcr.io \
  --docker-username=TU_USUARIO \
  --docker-password=TU_TOKEN \
  --docker-email=TU_CORREO
```

## Recomendación

Si quieres un entorno todavía más formal, lo ideal es publicar las imágenes en un registry privado y dejar este despliegue como GitOps ligero: `git pull` + `npm run deploy:cluster:4nodos`.

## Bootstrap con secretos locales

Si ya definiste los secretos en tu sesión local, puedes usar el bootstrap para crear el `imagePullSecret` y aplicar un override temporal sin guardar nada en el repo:

```bash
npm run deploy:cluster:4nodos:bootstrap
```

Variables esperadas:

- `SICOSE_JWT_SECRET`
- `SICOSE_POSTGRES_PASSWORD`
- `SICOSE_SUPABASE_URL`
- `SICOSE_SUPABASE_SERVICE_KEY`
- `SICOSE_INGRESS_HOST` opcional
- `SICOSE_CORS_ORIGIN` opcional
- `GHCR_USERNAME` opcional
- `GHCR_TOKEN` opcional

El bootstrap valida `kubectl` y `helm`, crea el namespace si hace falta y limpia el archivo temporal al terminar.
