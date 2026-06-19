# Evidencia real - Generacion automatica de adeudos

Fecha de generacion: 2026-06-18

Entorno usado:

- Base de datos real: Supabase
- Backend local conectado a Supabase
- Endpoint probado: `POST /api/adeudos/generar`

## Request probado

```json
{
  "periodo": "2026-07"
}
```

## Resultado primera ejecucion

- HTTP status: `201`
- Adeudos candidatos: `21`
- Adeudos creados: `21`

## Resultado segunda ejecucion

Se envio el mismo request una segunda vez para validar anti-duplicado.

- HTTP status: `201`
- Adeudos creados: `0`
- Grupos duplicados encontrados en Supabase: `0`

## Validacion en base de datos

Consulta posterior en Supabase:

```json
{
  "periodDebtsCount": 21,
  "duplicateGroups": []
}
```

## Seguridad RLS

Tambien se verifico que las 9 tablas marcadas por Supabase tienen RLS activo:

- `_prisma_migrations`
- `Adeudo`
- `Auditoria`
- `Ciudadano`
- `Comprobante`
- `Pago`
- `Reporte`
- `Servicio`
- `Usuario`

Archivo JSON completo:

`Docs/evidencias/adeudos-generacion-evidencia.json`
