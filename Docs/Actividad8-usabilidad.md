# SICOSE

## Reporte de Seguimiento Técnico y UX

**Comparativo Antes / Después de Remediación**
Junio 2026

---

> **Propósito del documento**
>
> Este reporte da seguimiento al "Diagnóstico Técnico y UX" y al "Reporte de errores con evidencia visual" entregados previamente. Documenta el estado "Antes" tal como fue identificado en ambos diagnósticos, y el estado "Después" de la sesión de remediación más reciente, en la que se corrigieron hallazgos de severidad Alta y se resolvieron los bloqueos de despliegue que impedían el acceso real al sistema.

---

## 1. Resumen Ejecutivo

El diagnóstico inicial identificó 14 hallazgos en backend, frontend y experiencia de usuario, además de 3 problemas críticos visibles directamente en la pantalla de login (issue interno expuesto, error de base de datos expuesto, y fallo de autenticación que impedía el acceso). En la sesión de remediación documentada en este reporte se corrigieron 9 de esos puntos: 4 de backend, 4 de frontend, y los 2 hallazgos críticos de la pantalla de login. Adicionalmente se resolvió el bloqueo de despliegue que mantenía a la aplicación inaccesible para usuarios finales.

**Estado general:**

- **Antes:** el sistema no permitía iniciar sesión en el entorno desplegado, exponía información técnica interna, y tenía 14 hallazgos documentados sin resolver.
- **Después:** el login funciona de extremo a extremo en producción, ya no se expone información técnica ni interna al usuario, y 9 de los 14 hallazgos del diagnóstico original quedaron resueltos.

| Indicador | Antes | Después |
|---|---|---|
| Acceso al sistema (login) en el entorno desplegado | No permitía el acceso | Acceso funcional |
| Información técnica/interna expuesta en UI | Sí (Issue ID y error de Prisma) | No |
| Hallazgos de backend resueltos | 0 de 4 aplicables | 4 de 4 |
| Hallazgos de frontend resueltos | 0 de 4 aplicables | 4 de 4 |
| Variable de entorno de producción (API URL) | Sin configurar (caía a localhost) | Configurada correctamente |

---

## 2. Hallazgos Críticos de la Pantalla de Login

Estos 3 hallazgos provienen del reporte de errores con evidencia visual entregado previamente. Eran bloqueantes para cualquier uso real del sistema.

### 2.1 No permitía iniciar sesión

| Área | Antes | Después |
|---|---|---|
| Acceso al sistema | El formulario de login no completaba el flujo de autenticación. El usuario quedaba bloqueado sin poder entrar al panel operativo, incluso con credenciales válidas. | El flujo de autenticación se completa correctamente. Se identificó y corrigió la causa raíz: el frontend desplegado apuntaba a una URL de API local (localhost) en lugar de la URL real del backend en producción, y la política CORS del backend no permitía el origen del frontend desplegado. Con ambas configuraciones corregidas, el login funciona de extremo a extremo. |

### 2.2 Número de Issue expuesto en la interfaz

| Área | Antes | Después |
|---|---|---|
| Frontend — LoginPage | En la parte inferior del formulario de login se mostraba el texto "Issue #007 – UI de login", un identificador interno de desarrollo visible para cualquier usuario final. | Se editó el componente de login para eliminar el texto de seguimiento interno. La pantalla ahora muestra únicamente contenido orientado al usuario final (título, subtítulo y mensajes de estado), sin referencias a tickets o identificadores de desarrollo. |

### 2.3 Error técnico de base de datos visible al usuario

| Área | Antes | Después |
|---|---|---|
| Frontend — LoginPage | Al intentar iniciar sesión se desplegaba la traza completa de Prisma ORM, incluyendo detalles del tenant y de PostgreSQL, exponiendo la arquitectura interna del sistema directamente en la interfaz de login. | Se editó el componente de login para mostrar mensajes de error genéricos y amigables en lugar de la traza técnica. Ningún detalle de la base de datos, del ORM o de la infraestructura se expone ya al usuario final. |

---

## 3. Hallazgos de Backend Resueltos

Los siguientes 4 hallazgos provienen del Diagnóstico Técnico y UX original (sección 3) y fueron corregidos en código durante esta sesión.

### 3.1 Ruta duplicada en app.ts

| Área | Antes | Después |
|---|---|---|
| Backend — Config | La instrucción `app.use('/api/adeudos', adeudosRouter)` estaba registrada dos veces en `app.ts`, generando riesgo de comportamiento impredecible (ejecución doble, errores de cabeceras duplicadas). | Se eliminó la declaración duplicada, dejando una sola instancia de la ruta registrada. El endpoint `/api/adeudos` ahora tiene un comportamiento determinístico. |

### 3.2 JWT_SECRET débil

| Área | Antes | Después |
|---|---|---|
| Backend — Seguridad | Los archivos de entorno usaban valores placeholder predecibles para `JWT_SECRET` ('change-me', 'change-me-in-dev'), lo que permitiría a un atacante falsificar tokens válidos si ese valor llegaba a producción. | Se generó un secreto aleatorio robusto y se configuró como variable de entorno en el proveedor de despliegue del backend, fuera del control de versiones. Los tokens emitidos en el entorno desplegado ya no usan un secreto predecible. |

### 3.3 Endpoint de leads sin persistencia

| Área | Antes | Después |
|---|---|---|
| Backend — Leads | El endpoint que recibe el formulario de contacto de la landing page generaba una respuesta de éxito sin guardar ningún dato en base de datos. Los leads enviados por usuarios se perdían silenciosamente. | Se implementó la persistencia del lead en base de datos. Los datos enviados desde el formulario de contacto ahora quedan registrados de forma real y consultable. |

### 3.4 Redis obligatorio sin fallback

| Área | Antes | Después |
|---|---|---|
| Backend — Infraestructura | El módulo de Redis no contaba con una instancia accesible desde el entorno de despliegue (apuntaba a localhost, inválido en producción), y el backend no arrancaba sin una conexión válida. | Se aprovisionó una instancia de Redis administrada accesible desde internet y se configuró su URL real como variable de entorno en el backend. El servicio arranca de forma estable con la conexión a Redis ya validada en el entorno de producción. |

---

## 4. Hallazgos de Frontend Resueltos

Los siguientes 4 hallazgos provienen del Diagnóstico Técnico y UX original (sección 4) y fueron corregidos durante esta sesión.

### 4.1 Ausencia de redirección post-login

| Área | Antes | Después |
|---|---|---|
| Frontend — UX | Tras un login exitoso, el usuario permanecía en la pantalla de login sin ser redirigido al panel operativo, sin indicación clara de cómo continuar. | Se implementó la redirección automática al dashboard inmediatamente después de un login exitoso. El usuario ya no queda atrapado en la pantalla de inicio de sesión. |

### 4.2 Páginas protegidas sin redirección al login

| Área | Antes | Después |
|---|---|---|
| Frontend — Sesión | Las páginas protegidas (dashboard, ciudadanos) mostraban un mensaje de error en pantalla cuando no existía una sesión activa, en lugar de redirigir al usuario al login. | Se implementó la redirección automática al login cuando no se detecta una sesión válida en las páginas protegidas, eliminando la pantalla de error confusa. |

### 4.3 Archivo duplicado LandingPage

| Área | Antes | Después |
|---|---|---|
| Frontend — Archivos | Existían simultáneamente `LandingPage.jsx` y `LandingPage.tsx` en el repositorio, generando ambigüedad sobre cuál archivo era el vigente y riesgo de editar el incorrecto. | Se eliminó el archivo obsoleto, dejando una única versión autoritativa de LandingPage en el proyecto. |

### 4.4 VITE_API_BASE_URL sin valor de producción

| Área | Antes | Después |
|---|---|---|
| Frontend — Configuración | La variable `VITE_API_BASE_URL` no estaba configurada en el proveedor de despliegue del frontend, por lo que la aplicación caía al valor por defecto (localhost), provocando que todas las peticiones al backend fallaran silenciosamente para cualquier usuario final. | Se configuró `VITE_API_BASE_URL` con la URL real del backend en el panel de variables de entorno del proveedor de despliegue, y se ejecutó un nuevo build para aplicar el cambio. El frontend desplegado ahora se comunica correctamente con el backend real. |

---

## 5. Hallazgos Pendientes

Los siguientes puntos del diagnóstico original no fueron abordados en esta sesión y permanecen documentados para una próxima iteración, ordenados según la severidad asignada en el reporte original.

| Hallazgo | Descripción | Severidad |
|---|---|---|
| Validación de variables de entorno | El mensaje de error al faltar una variable crítica no identifica claramente cuál falta ni el valor esperado. | Media |
| Enrutamiento manual | `App.tsx` usa `window.location.pathname` con condicionales en lugar de un router; no soporta rutas dinámicas ni un 404 propio. | Media |
| Validación del campo de contacto | El campo "Teléfono o Correo" del formulario de la landing acepta cualquier texto sin validar formato. | Media |
| Error genérico en formulario de contacto | Cuando falla el envío del formulario, el usuario no recibe información sobre la causa ni una vía de reintento. | Media |
| Recuperación de contraseña | No existe flujo de "Olvidé mi contraseña", lo que bloquea a usuarios que pierdan sus credenciales. | Baja |
| Navegación basada en rutas exactas | El menú de navegación (RoutePills) es frágil ante el crecimiento de sub-rutas anidadas. | Baja |

---

## 6. Conclusión

El sistema pasó de un estado no funcional en el entorno desplegado —con el login bloqueado e información técnica interna expuesta— a un estado operativo donde el flujo de autenticación funciona de extremo a extremo sin filtrar detalles internos al usuario. De los 14 hallazgos documentados en el diagnóstico original, 8 fueron resueltos en esta sesión (4 de backend y 4 de frontend), junto con los 3 hallazgos críticos reportados específicamente sobre la pantalla de login.

Se recomienda priorizar en la siguiente iteración los hallazgos de severidad Media listados en la sección 5, en particular la validación de variables de entorno y la validación del campo de contacto del formulario, dado que ambos afectan directamente la calidad de los datos que ingresan al sistema.

> **Próximo paso sugerido**
>

---

*Reporte generado en junio de 2026 · Seguimiento de remediación sobre el Diagnóstico Técnico y UX y el Reporte de errores previamente entregados.*