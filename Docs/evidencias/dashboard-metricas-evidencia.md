# Evidencia - Dashboard de metricas

Fecha de generacion: 2026-06-18

Entorno usado:

- Base de datos real: Supabase
- Backend local conectado a Supabase
- Endpoint probado: `GET /api/dashboard/metricas`

## Resultado del endpoint

Primera llamada:

- HTTP status: `200`
- Tiempo: `1210.14 ms`
- Cache hit: `false`

Segunda llamada:

- HTTP status: `200`
- Tiempo: `739.48 ms`
- Cache hit: `false`

## KPIs retornados

```json
{
  "periodo": "2026-06",
  "totalRecaudadoMes": 91,
  "porcentajeCobertura": 0,
  "numeroMorosos": 0
}
```

El endpoint tambien retorna:

- Comparativo contra mes anterior.
- Total de adeudos del mes.
- Pagos registrados del mes.
- Direccion de variacion para flecha visual.
- Color semaforico.
- Ultima actualizacion.
- Estado de cache.

## Redis

El codigo usa Redis con TTL de `300` segundos mediante la key:

```text
dashboard:metricas:YYYY-MM
```

En esta maquina la variable `REDIS_URL` apunta a:

```text
localhost:6379
```

Durante la evidencia no habia servidor Redis local levantado, por eso el backend calculo las metricas desde Supabase y no pudo marcar `cache.hit=true`.

Para completar la captura de Redis CLI se necesita una de estas opciones:

- Levantar Redis local en `localhost:6379`.
- Configurar `REDIS_URL` con Upstash/Railway Redis.

## Evidencia JSON

Archivo completo:

`Docs/evidencias/dashboard-metricas-evidencia.json`
