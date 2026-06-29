# Backlog priorizado para cerrar el MVP de SiCoSe

Este documento resume, a partir del estado actual del repositorio, qué historias sí son realmente necesarias para dejar el producto funcional de extremo a extremo y en qué orden conviene atacarlas.

## Criterio de priorización

Se ordenó por:
1. Dependencias técnicas y de negocio.
2. Riesgo operativo si no existe.
3. Impacto directo en el flujo principal del MVP.
4. Facilidad relativa de implementación.

## Historias necesarias, de más crítica a más fácil

### 1) Autenticación completa con roles y sesiones
**Objetivo:** garantizar acceso seguro, expiración, renovación y cierre de sesión.

**Incluye:**
- login
- refresh token
- logout seguro
- control de rol por ruta
- baja/inactivación de usuario

**Por qué va primero:** sin esta base no hay control real de acceso ni seguridad mínima.

---

### 2) Administración de usuarios del sistema
**Objetivo:** permitir crear, editar y desactivar cuentas para admin, tesorero y secretaria.

**Incluye:**
- alta de usuario
- edición de rol/datos
- baja lógica de usuario
- auditoría del cambio

**Por qué es crítica:** el sistema depende de usuarios con permisos distintos y hoy ese ciclo no está completo.

---

### 3) Registro de ciudadanos con auditoría
**Objetivo:** crear y actualizar ciudadanos con validación, unicidad y trazabilidad.

**Incluye:**
- alta de ciudadano
- edición de datos
- validación con Zod
- email único
- auditoría de alta/edición

**Por qué sigue:** es la base del padrón operativo para todo el flujo de cobro.

---

### 4) Baja / reactivación de ciudadanos
**Objetivo:** sacar ciudadanos del padrón activo sin perder historial.

**Incluye:**
- desactivación lógica
- reactivación
- exclusión de búsquedas activas
- conservación del historial

**Por qué importa:** evita pérdida de trazabilidad y mantiene integridad de los adeudos ya registrados.

---

### 5) Generación automática de adeudos
**Objetivo:** crear adeudos mensuales sin intervención manual.

**Incluye:**
- endpoint de generación
- cron job mensual
- restricción única por ciudadano/servicio/periodo
- resumen de creados/omitidos

**Por qué es crítica:** sin esto el sistema no escala ni mantiene el ciclo mensual de cobranza.

---

### 6) Registro de pagos con comprobante
**Objetivo:** capturar pagos en efectivo o transferencia con folio único y trazabilidad.

**Incluye:**
- validación con Zod
- folio `SCS-YYYY-XXXXXX`
- actualización atómica del adeudo
- carga de comprobante
- auditoría del pago

**Por qué sigue:** este es el flujo central del negocio.

---

### 7) Consulta de adeudos e historial por ciudadano
**Objetivo:** dar visibilidad completa de lo que debe y de lo que ya pagó.

**Incluye:**
- adeudos pendientes
- historial de pagos y adeudos
- filtros por periodo/servicio/estado
- estados visuales claros

**Por qué sigue:** reduce errores de cobro y elimina consultas manuales.

---

### 8) Dashboard operativo y listado de morosos
**Objetivo:** dar control gerencial del estado de cobranza.

**Incluye:**
- KPIs principales
- gráfica de tendencia
- cache en Redis
- listado de morosos
- exportación a Excel

**Por qué sigue:** no bloquea el cobro, pero sí es clave para operación y seguimiento.

---

### 9) Cierre profesional del flujo de comprobantes y pagos
**Objetivo:** evitar inconsistencias antes y después de confirmar un pago.

**Incluye:**
- eliminar comprobante antes de confirmar
- impedir reemplazo una vez confirmado
- anulación de pago con motivo y auditoría

**Por qué va después:** son reglas de control fino para un flujo ya operativo.

---

### 10) Auditoría completa del sistema
**Objetivo:** asegurar trazabilidad de las acciones relevantes.

**Incluye:**
- auditorías de login/logout
- auditorías de altas, ediciones, pagos y anulaciones
- consulta administrativa

**Por qué cierra el sistema:** el proyecto financiero pierde valor si no puede auditarse.

---

### 11) Reintentos de integración y webhooks
**Objetivo:** robustecer integraciones externas.

**Incluye:**
- cola o proceso de reintento
- backoff exponencial
- registro de intentos

**Por qué va al final:** mejora confiabilidad, pero no bloquea el MVP base.

---

## Qué ya está bastante encaminado

- Login básico y validación de credenciales.
- Control de roles por middleware.
- Registro de pagos y folios únicos.
- Subida y validación de comprobantes.
- Dashboard con caché en Redis.
- Generación de reportes.
- Soft delete de ciudadanos.
- Auditoría básica.

## Dónde deben hacerse los cambios para cerrar el 100%

### Backend

- `backend/src/routes/auth.ts`
  - refresh token
  - logout seguro con auditoría
  - sesión inactiva / rotación

- `backend/src/middleware/require-role.ts`
  - endurecer validación de rol y sesión

- `backend/src/routes/ciudadanos.ts`
  - auditoría de alta/edición/baja
  - reactivación
  - validaciones de negocio más estrictas

- `backend/src/routes/adeudos.ts`
  - cron/endpoint de generación
  - consulta de pendientes e historial
  - exportación de morosos

- `backend/src/routes/pagos.ts`
  - anulación de pago
  - control de comprobante antes/después de confirmación

- `backend/src/services/pagos.ts`
  - atomicidad
  - folios
  - comprobantes
  - hash y trazabilidad

- `backend/src/services/dashboard.ts`
  - completar KPIs requeridos
  - serie histórica de 6 meses

- `backend/src/services/auditorias.ts`
  - consultas por filtros y exportables

- `backend/prisma/schema.prisma`
  - sesiones
  - refresh tokens
  - blacklist o tablas auxiliares
  - campos faltantes de auditoría y control

- `backend/src/lib/redis.ts`
  - soporte de sesiones, blacklist y cachés de negocio

### Frontend

- `frontend/src/App.tsx`
  - flujo natural entre pantallas
  - guards por rol
  - redirecciones consistentes

- `frontend/src/pages/auth/LoginPage.tsx`
  - integración completa con refresh y sesión persistente

- `frontend/src/pages/citizens/CitizenManagementPage.tsx`
  - conexión real con backend
  - búsqueda, edición y desactivación

- `frontend/src/pages/dashboard/DashboardPage.tsx`
  - KPIs completos
  - gráfica
  - exportación

- `frontend/src/features/auth/*`
  - manejo de refresh token
  - logout seguro

- `frontend/src/features/citizens/*`
  - validación y sincronización con API

- `frontend/src/features/dashboard/*`
  - tipos, API y render de métricas reales

### Infraestructura / despliegue

- `docker-compose.yml`
  - Postgres 16
  - Redis 7
  - variables en `.env.docker`

- `README.md`
  - pasos reales de levantado local
  - credenciales de ejemplo
  - flujo de desarrollo

- `.github/workflows/*`
  - validar build, lint, test y despliegue

- `backend/railway.json` y `frontend/vercel.json`
  - ajustes de deploy por ambiente

### Documentación

- `Docs/Flujo del Sistema-Act5.md`
- `Docs/ModelodeDatos-Act5.md`
- `Docs/deploy-guia.md`
- `Docs/evidencias/*`

## Recomendación práctica de ejecución

1. Cerrar autenticación y sesiones.
2. Cerrar usuarios/roles.
3. Cerrar ciudadanos y auditoría.
4. Cerrar adeudos y pagos.
5. Cerrar historial, dashboard y morosos.
6. Cerrar anulación, comprobantes y reintentos.
7. Ajustar frontend para que el flujo quede natural.
8. Corregir documentación y despliegue.

## Resultado esperado cuando termine

- Flujo de login funcional.
- Flujo ciudadano conectado.
- Flujo de adeudos y pagos consistente.
- Auditoría completa.
- Dashboard operativo con métricas reales.
- Deploy reproducible con Docker y variables externas.
- Frontend navegable sin pantallas sueltas.

