# Evidencia real - Pago en efectivo

Fecha de generacion: 2026-06-18

Entorno usado:

- Base de datos real: Supabase
- Backend local conectado a Supabase
- Endpoint probado: `POST /api/pagos`

## Migraciones

Resultado de `npm run prisma:migrate:status`:

```text
Database schema is up to date!
```

## Datos de prueba

- Usuario autenticado: `gertrudis@sicose.test`
- Rol: `tesorero`
- Ciudadano: `evidencia.pagos@sicose.test`
- Adeudo usado: `1719ee26-b923-4da0-a68a-251e81cbae3b`
- Monto del adeudo: `45.5`

## Pago exitoso

Request:

```json
{
  "metodo": "efectivo",
  "ciudadano_id": "10a9239b-fef8-47e2-8ea7-7c885ffc30ba",
  "adeudo_id": "1719ee26-b923-4da0-a68a-251e81cbae3b",
  "monto": 45.5
}
```

Resultado:

- HTTP status: `201`
- Folio generado: `SCS-2026-716340`
- Pago creado: `643589e8-831c-4558-9817-c91213716ab7`

## Validacion del adeudo

Consulta posterior en Supabase:

```json
{
  "id": "1719ee26-b923-4da0-a68a-251e81cbae3b",
  "monto": 45.5,
  "pagado": true,
  "estado": "pagado"
}
```

## Validacion de duplicidad

Se envio el mismo request por segunda vez.

Resultado:

- HTTP status: `409`
- Respuesta:

```json
{
  "error": "Debt is already paid",
  "code": 409
}
```

## Auditoria

Registro creado en Supabase:

```json
{
  "id": "0190ede4-7be6-4aa4-adfa-70ca450f65d3",
  "usuarioId": "9adc08cc-516d-40d0-af83-38f082e12961",
  "accion": "REGISTRO_PAGO_EFECTIVO",
  "entidad": "Pago",
  "entidad_id": "643589e8-831c-4558-9817-c91213716ab7",
  "ip": "::ffff:127.0.0.1",
  "timestamp": "2026-06-18T15:49:45.966Z"
}
```

Archivo JSON completo:

`Docs/evidencias/pagos-efectivo-evidencia.json`
