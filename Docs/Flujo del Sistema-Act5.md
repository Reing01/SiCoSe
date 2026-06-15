## 4. Flujo del Sistema

### Flujo: Registrar Pago en Efectivo — Usuario: Gertrudis (Tesorera)
1. Gertrudis busca al ciudadano por nombre o clave catastral en la ventanilla.
2. El sistema muestra adeudos pendientes del ciudadano seleccionado.
3. Gertrudis selecciona el adeudo y confirma el monto recibido en efectivo.
4. El sistema genera folio único (`SCS-YYYY-XXXXXX`), registra en pagos y actualiza estado del adeudo → `pagado`.
5. El sistema genera e imprime recibo PDF con folio, fecha, monto y firma digital del tesorero.
6. Auditoría registra automáticamente: Gertrudis, acción=`registro_pago`, IP, timestamp.

---

### Flujo: Registrar Pago por Transferencia — Usuario: Juan Alberto Castillo
1. Juan Alberto envía comprobante por WhatsApp o lo presenta en ventanilla.
2. Gertrudis busca al ciudadano en el sistema y selecciona el adeudo correspondiente.
3. Sube el archivo del comprobante (jpg/pdf, máximo 5MB) desde el formulario.
4. El sistema calcula hash SHA256 del archivo como sello de autenticidad inalterable.
5. Registra pago con referencia bancaria, folio único y URL permanente del comprobante.
6. Adeudo se marca como `pagado`; Rosalía Flores y Yohana Hernández pueden consultar su historial.

---

### Flujo: Generar Reporte de Recaudación — Usuario: Cristian (Presidente)
1. Cristian selecciona período, zona y tipo de servicio desde el dashboard.
2. El sistema consulta BD con filtros y agrega datos por categoría en tiempo real.
3. El dashboard muestra KPIs: total recaudado del mes, % de cobertura, número de morosos.
4. Cristian exporta a PDF institucional (con gráficas) o Excel (datos crudos) para su reunión.
5. El reporte queda guardado en historial con URL de descarga permanente.

---

### Flujo: Identificar Morosos — Usuarios: Cristian y María Nerida
1. El sistema ejecuta job diario (cron a las 00:01) revisando adeudos con `fecha_vencimiento < hoy`.
2. Actualiza estado → `vencido`, calcula monto total acumulado con recargos configurados.
3. Cristian visualiza la lista de morosos filtrada por zona para planear campañas de regularización.
4. María Nerida puede exportar el listado de morosos a Excel para gestión del padrón ciudadano.

---

## 4.1 APIs y Endpoints

Todos los endpoints son **REST sobre HTTPS**.
Prefijo base: `/api/v1`
Respuestas en JSON con estructura `{ data, message, pagination? }`.
Errores con código HTTP + `{ error, code, details }`.

| Método | Endpoint                     | Descripción                                                   | Auth        |
|--------|------------------------------|---------------------------------------------------------------|-------------|
| POST   | /api/auth/login              | Autenticación con email y contraseña. Retorna JWT             | Pública     |
| POST   | /api/auth/logout             | Revoca token JWT en blacklist Redis                           | JWT         |
| GET    | /api/auth/me                 | Perfil del usuario autenticado                                | JWT         |
| GET    | /api/ciudadanos              | Listado paginado con filtros por zona/nombre                  | JWT         |
| POST   | /api/ciudadanos              | Registrar nuevo ciudadano                                     | JWT+Admin   |
| GET    | /api/ciudadanos/:id/adeudos  | Historial de adeudos por ciudadano                            | JWT         |
| GET    | /api/pagos                   | Listado de pagos con filtros por fecha/método                 | JWT         |
| POST   | /api/pagos                   | Registrar pago (efectivo o transferencia)                     | JWT         |
| GET    | /api/pagos/:id/comprobante   | Descargar comprobante de pago                                 | JWT         |
| GET    | /api/adeudos/morosos         | Ciudadanos con adeudos vencidos                               | JWT         |
| POST   | /api/adeudos/generar         | Generar adeudos del mes actual en batch                       | JWT+Admin   |
| GET    | /api/reportes/recaudacion    | Reporte por período, zona y servicio                          | JWT         |
| GET    | /api/reportes/comparativo    | Comparativo mes anterior vs actual                            | JWT         |
| POST   | /api/reportes/exportar       | Generar PDF/Excel de reporte                                  | JWT         |
| GET    | /api/servicios               | Catálogo de servicios activos                                 | JWT         |
| GET    | /api/dashboard/metricas      | KPIs para pantalla principal                                  | JWT         |
| GET    | /api/auditorias              | Log de acciones del sistema                                   | JWT+Admin   |

---

## 4.2 Seguridad del Sistema

La seguridad se diseñó con un enfoque de **defensa en profundidad**, siguiendo OWASP Top 10.

| Amenaza              | Mitigación implementada                                               | Capa         |
|----------------------|------------------------------------------------------------------------|--------------|
| SQL Injection        | Prisma ORM con queries parametrizadas, nunca concatenación de strings | BD + ORM     |
| XSS                  | Sanitización con DOMPurify en frontend, headers CSP                   | FE + HTTP    |
| CSRF                 | Tokens SameSite=Strict en cookies + validación Origin en CORS         | Backend      |
| Brute Force          | Rate limiting (10 intentos/min) en /auth/login vía Redis              | Backend      |
| Passwords débiles     | Bcrypt factor 12, longitud mínima 8 chars, validación Zod             | Backend      |
| JWT comprometido     | Blacklist en Redis al logout, expiración 8h, RefreshToken 7d          | Backend      |
| Datos en tránsito    | HTTPS obligatorio (TLS 1.3), HSTS habilitado                          | Infra        |
| Escalación privilegios| Middleware de roles en cada ruta                                     | Backend      |
| Archivos maliciosos  | Validación MIME type + extensión, límite 5MB, almacenamiento en S3    | Backend      |
| Logs sensibles       | Datos PII nunca en logs, audit trail cifrado en BD                    | Backend + BD |

**Política de Contraseñas**
- Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 carácter especial.
- Hash con Bcrypt factor 12 (~300ms por verificación).
- Nunca se almacena ni registra la contraseña en texto plano.
- Flujo de recuperación por email con token OTP de un solo uso (expira en 15 min).

---

## 4.3 Infraestructura y Despliegue

| Componente          | Servicio           | Razón                                                     | Costo MVP |
|---------------------|-------------------|-----------------------------------------------------------|-----------|
| Frontend            | Vercel            | CDN global, SSL automático, deploy en git push            | Gratis    |
| Backend API         | Railway           | Node.js managed, variables de entorno, logs integrados    | ~$5/mes   |
| Base de datos       | Supabase          | PostgreSQL managed, backups, dashboard visual, free tier  | Gratis    |
| Caché / Sesiones    | Upstash Redis     | Redis serverless, pago por request, ideal para MVP        | Gratis    |
| Archivos / S3       | Supabase Storage  | Comprobantes de pago, PDFs generados, URLs firmadas       | 1GB gratis|
| CI/CD               | GitHub Actions    | 2000 min/mes gratuitos, integrado con el repositorio      | Gratis    |
| DNS + SSL           | Cloudflare        | Proxy WAF, DDoS protection, certificados SSL automáticos  | Gratis    |

**Variables de Entorno Requeridas**
```env
DATABASE_URL=postgresql://user:pass@host:5432/sicose_db
REDIS_URL=rediss://user:pass@host:port
JWT_SECRET=<openssl rand -base64 32>
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES=7d
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
ALLOWED_ORIGINS=https://sicose.vercel.app
NODE_ENV=production
