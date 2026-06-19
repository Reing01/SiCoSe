# Evidencia - Issue #008 CRUD API de ciudadanos

## Endpoints probados

- `GET /api/ciudadanos`: listado paginado con metadata.
- `GET /api/ciudadanos/:id`: detalle completo del ciudadano.
- `POST /api/ciudadanos`: creacion con validacion Zod.
- `PUT /api/ciudadanos/:id`: actualizacion parcial.
- `PUT /api/ciudadanos/:id/desactivar`: soft delete con `activo=false`.

## Criterios cubiertos

- Paginacion default de 20 registros por pagina.
- Filtros por nombre parcial y zona.
- Busqueda case-insensitive por nombre o apellido.
- Busqueda por clave catastral exacta usando el parametro `nombre`.
- Metadata de paginacion: `total`, `pagina`, `limite`, `totalPaginas`.
- Rutas protegidas con JWT.
- Escritura restringida a rol `admin`.

## Pruebas tecnicas

- `tsc -p tsconfig.json --noEmit`: OK.
- `tsc -p tsconfig.json`: OK.
- Tests backend existentes: OK.
- Test `ciudadanos.test.ts`: verifica busqueda con tres ciudadanos distintos.

## Captura esperada

Para la evidencia visual, capturar en Postman la respuesta:

`GET /api/ciudadanos?pagina=1&zona=Centro`

Debe mostrar:

```json
{
  "data": [],
  "metadata": {
    "total": 0,
    "pagina": 1,
    "limite": 20,
    "totalPaginas": 0
  }
}
```

Los valores de `data` y `total` cambian segun la base sembrada.
