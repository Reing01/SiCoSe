# Práctica de clúster de 4 nodos - SiCoSe

Este perfil despliega SiCoSe en cuatro máquinas con Docker Swarm. El puerto HTTP se publica en modo `ingress`, por lo que el routing mesh acepta conexiones en cualquier nodo y las dirige a una réplica disponible del proxy.

Las imágenes se publican automáticamente en GHCR cuando se hace `push` a `main`:

- `ghcr.io/reing01/sicose-backend`
- `ghcr.io/reing01/sicose-frontend`

## Arquitectura

- Un nodo manager, que también debe permanecer disponible para ejecutar cargas.
- Tres nodos worker.
- Cuatro réplicas del proxy de entrada, como máximo una por nodo.
- Doce réplicas del backend y doce del frontend, como máximo tres por nodo.
- PostgreSQL y Redis en el manager, con volúmenes persistentes locales.
- Redes `overlay` separadas y cifradas para tráfico web y datos.
- El puerto `80` publicado con `mode: ingress`; puede cambiarse con `SICOSE_HTTP_PORT`.
- Enrutamiento `/api/*` al backend y el resto al frontend.

El límite de réplicas por nodo mantiene la distribución 3 + 3 + 3 + 3. Si un nodo deja de estar disponible, tres réplicas de cada aplicación quedarán pendientes hasta que el nodo vuelva o se amplíe el clúster; las nueve restantes siguen atendiendo tráfico.

## Preparar el Swarm

En el nodo principal:

```bash
docker swarm init --advertise-addr IP_DEL_MANAGER
```

El comando muestra el `docker swarm join` que debe ejecutarse en cada worker. Antes del despliegue, verifica desde el manager:

```bash
docker node ls
```

Los cuatro nodos deben figurar como `Ready` y el manager debe estar en disponibilidad `Active`.

Abre estos puertos entre nodos:

- `2377/tcp` para administración del clúster.
- `7946/tcp` y `7946/udp` para descubrimiento entre nodos.
- `4789/udp` para las redes overlay.
- El puerto HTTP publicado, `80/tcp` por defecto, para los clientes.

## Configurar secretos y desplegar

Copia `.env.swarm.example` a un archivo local fuera del repositorio o exporta sus valores directamente en la sesión. El script requiere:

- `SICOSE_POSTGRES_PASSWORD`
- `SICOSE_JWT_SECRET` con al menos 32 caracteres
- `SICOSE_SUPABASE_URL`
- `SICOSE_SUPABASE_SERVICE_KEY`

En Bash, un ejemplo para cargar un archivo local es:

```bash
set -a
source /ruta/segura/sicose.swarm.env
set +a
npm run deploy:cluster:4nodos
```

El comando:

1. valida que se ejecute desde un manager;
2. crea secretos versionados de Docker sin escribirlos en el repositorio;
3. crea PostgreSQL, Redis y las redes en el primer despliegue;
4. ejecuta una sola tarea de migración antes de actualizar la aplicación;
5. despliega el proxy, 12 backends y 12 frontends;
6. espera hasta que todos los servicios converjan;
7. comprueba por HTTP el routing mesh, el frontend y la disponibilidad del backend, PostgreSQL y Redis.

También está disponible el nombre explícito:

```bash
npm run deploy:swarm:4nodos
```

Si GHCR es privado, define juntos `GHCR_USERNAME` y `GHCR_TOKEN`. El script inicia sesión y distribuye la autorización a los nodos del Swarm.

`SICOSE_VERIFY_URL` permite cambiar la URL usada en la comprobación final. Por defecto se consulta `http://127.0.0.1:SICOSE_HTTP_PORT` desde el manager.

El script configura la cookie de renovación de sesión según `SICOSE_PUBLIC_ORIGIN`: en HTTP usa una cookie local `SameSite=Lax`, y en HTTPS habilita `Secure` y `SameSite=None`. Esto evita que el navegador descarte la cookie en la práctica HTTP y mantiene el comportamiento seguro detrás de TLS.

`SICOSE_TRUST_PROXY_HOPS` vale `1` porque normalmente solo existe el proxy `edge` delante del backend. Si un balanceador externo termina TLS antes de `edge`, configúralo en `2`; no uses un valor mayor al número real de proxies porque permitiría falsificar la IP usada por el rate limit y la auditoría.

## Verificación

Desde el manager:

```bash
docker stack services sicose
docker stack ps sicose
```

Desde cualquier máquina que alcance el clúster, prueba la IP de cada nodo:

```bash
curl http://IP_DE_CUALQUIER_NODO/routing-mesh-health
curl http://IP_DE_CUALQUIER_NODO/api/health
```

La primera respuesta debe ser `ok`; la segunda confirma la API. No hace falta que el nodo consultado tenga una réplica concreta: el routing mesh envía la conexión a una tarea activa.

## Actualizaciones y rollback

Vuelve a ejecutar el mismo comando para actualizar las imágenes. Las tareas se reemplazan gradualmente en modo `stop-first`, necesario porque el límite de tres réplicas por nodo deja ocupados los doce espacios disponibles. Swarm revierte automáticamente una actualización que no supera sus comprobaciones de salud.

Para volver manualmente a la especificación anterior de un servicio:

```bash
docker service rollback sicose_backend
docker service rollback sicose_frontend
docker service rollback sicose_edge
```

## Persistencia

PostgreSQL y Redis están fijados al manager porque sus volúmenes usan almacenamiento local. Esto es apropiado para la práctica, pero el routing mesh no convierte esos volúmenes en almacenamiento distribuido. Para alta disponibilidad real de datos se necesita almacenamiento compartido o servicios externos administrados.

El script bloquea cambios directos de `SICOSE_POSTGRES_DB`, `SICOSE_POSTGRES_USER` o `SICOSE_POSTGRES_PASSWORD` cuando ya existe un volumen. También conserva un metadato no secreto de identidad para validar un volumen cuando el stack fue retirado pero sus datos permanecen. Cambiar variables en el manifiesto no modifica las credenciales guardadas dentro de PostgreSQL; primero debe realizarse una migración o rotación explícita.

El proxy integrado publica HTTP. En una instalación expuesta a Internet se debe terminar TLS delante del routing mesh mediante un balanceador o proxy confiable y configurar `SICOSE_PUBLIC_ORIGIN` con la URL HTTPS.

Los manifiestos `k8s/` y el chart `helm/` quedan como referencia histórica; el flujo activo de cuatro nodos es `swarm/stack.yml` y ya no requiere Kubernetes, `kubectl` ni Helm.
