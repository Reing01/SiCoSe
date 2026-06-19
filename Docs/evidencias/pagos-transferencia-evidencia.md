# Evidencia real - Pago por transferencia

Fecha de generacion: 2026-06-18

Entorno usado:

- Base de datos real: Supabase
- Storage real: Supabase Storage bucket privado `comprobantes`
- Backend local conectado a Supabase
- Endpoint probado: `POST /api/pagos`

## Bucket privado

Bucket verificado:

```json
{
  "bucket": "comprobantes",
  "public": false,
  "fileSizeLimit": 5242880,
  "allowedMimeTypes": ["image/jpeg", "image/png", "application/pdf"]
}
```

## Request probado

`multipart/form-data`:

```text
metodo=transferencia
ciudadano_id=74285200-ad51-45e8-9985-5ca053f2ad01
adeudo_id=86a1b87b-0047-40d4-9294-f0ba7c64c099
monto=45.5
referencia_bancaria=SPEI-*
comprobante=comprobante-transferencia.pdf
```

## Resultado del pago

- HTTP status: `201`
- Folio generado: `SCS-2026-929780`
- Storage path: `pagos/2026/SCS-2026-929780.pdf`
- URL guardada en comprobante: si

## Hash SHA256

Hash calculado del archivo:

```text
68d3dbe223d4659eb030429ecc280a437eb6e9b042a59797cbbd9e16f56c1d56
```

Hash guardado en tabla `Comprobante`:

```text
68d3dbe223d4659eb030429ecc280a437eb6e9b042a59797cbbd9e16f56c1d56
```

Resultado: coincide.

## Validacion en base de datos

Adeudo posterior al pago:

```json
{
  "estado": "pagado",
  "pagado": true
}
```

Comprobante guardado:

```json
{
  "tipo": "application/pdf",
  "mime_type": "application/pdf",
  "nombre_archivo": "comprobante-transferencia.pdf",
  "tamano_bytes": 75,
  "storage_path": "pagos/2026/SCS-2026-929780.pdf"
}
```

Auditoria:

```json
{
  "accion": "REGISTRO_PAGO_TRANSFERENCIA",
  "entidad": "Pago"
}
```

## Test de archivo invalido

Existe prueba automatica que intenta registrar `comprobante.exe` con firma real no permitida.

Resultado esperado:

```text
400 - Receipt file must be a real jpg, png or pdf
```

Archivo JSON completo:

`Docs/evidencias/pagos-transferencia-evidencia.json`
