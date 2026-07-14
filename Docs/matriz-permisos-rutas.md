# Matriz de permisos por ruta

## Reglas vigentes

- `admin` tiene acceso a todas las rutas protegidas.
- `tesorero` tiene acceso a `dashboard`, `cobranza` y `reportes`.
- `secretaria` tiene acceso a `ciudadanos` y consultas operativas asociadas.
- Un token con rol invalido responde `401`.
- Un rol autentico sin permiso suficiente responde `403` con `Insufficient role`.

## Matriz base

| Recurso/Ruta | admin | tesorero | secretaria |
| --- | --- | --- | --- |
| `/dashboard` | Si | Si | No |
| `/ciudadanos` | Si | No | Si |
| `cobranza` | Si | Si | No |
| `reportes` | Si | Si | No |

## Criterio de implementacion

- Backend manda la autorizacion final mediante middleware.
- Frontend oculta accesos no permitidos y redirige al home valido del rol.
- La fuente comun debe mantenerse centralizada en los modulos de autorizacion.
