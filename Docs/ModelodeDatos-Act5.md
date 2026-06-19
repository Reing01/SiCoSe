## 2. Modelo de Datos

### Entidad-Relación
La base de datos PostgreSQL contiene 8 entidades principales. Se normalizó a 3FN para eliminar redundancias. Los *soft deletes* (campo activo) preservan la integridad del historial. Todos los IDs son **UUID v4** para evitar enumeración en URLs.

| Entidad | Campos Principales | Relaciones | Índices | Notas |
| :--- | :--- | :--- | :--- | :--- |
| **usuarios** | id, nombre, email, password_hash, rol, activo, created_at | 1:N pagos, 1:N auditorias | email UNIQUE, rol + activo | - |
| **ciudadanos** | id, nombre_completo, direccion, telefono, zona, clave_catastral, created_at | 1:N adeudos, 1:N pagos | clave_catastral UNIQUE, zona + nombre | - |
| **servicios** | id, nombre, descripcion, monto_base, tipo, activo | 1:N adeudos, 1:N pagos | tipo + activo | - |
| **adeudos** | id, ciudadano_id, servicio_id, año, mes, monto, estado, fecha_vencimiento | N:1 ciudadanos, N:1 servicios, 1:1 pagos | ciudadano_id + estado, servicio_id + año | - |
| **pagos** | id, ciudadano_id, adeudo_id, usuario_id, monto, metodo, referencia, folio | N:1 ciudadanos, N:1 adeudos, N:1 usuarios | folio UNIQUE, fecha + metodo | Folio único |
| **comprobantes** | id, pago_id, archivo_url, hash_sha256, verificado | N:1 pagos | hash_sha256 UNIQUE | SHA256 |
| **auditorias** | id, usuario_id, accion, tabla, registro_id, detalle_json, created_at | N:1 usuarios | usuario_id + accion, created_at | Inmutable |
| **reportes** | id, generado_por, tipo, parametros_json, archivo_url | N:1 usuarios | tipo + created_at | - |

### Relaciones Clave

* **ciudadanos ──< adeudos**: Un ciudadano puede tener N adeudos (uno o varios por servicio/mes).
* **adeudos ──< pagos**: Un adeudo se liquida con uno o más pagos parciales.
* **pagos >── usuarios**: Cada pago registra qué usuario lo capturó (auditoría).
* **pagos ──< comprobantes**: Un pago transferencia tiene 1..N comprobantes adjuntos.
* **usuarios ──< auditorias**: Historial completo de acciones por usuario.
* **servicios ──< adeudos**: Cada tipo de servicio genera adeudos independientes.