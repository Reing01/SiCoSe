# 5. Esquema de Pruebas

El plan de pruebas sigue la pirámide de testing: base amplia de pruebas unitarias, capa intermedia de integración y cima de E2E selectivos. Se ejecutan automáticamente en cada PR vía GitHub Actions.

| Tipo | Herramienta | Cobertura objetivo | Casos clave |
| :--- | :--- | :--- | :--- |
| **Unitarias (BE)** | Jest + Supertest | >= 80% funciones de negocio | Pagos duplicados, cálculo de adeudos, hash de contraseñas |
| **Integración (BE)** | Jest + Test DB | Flujos completos de API | Registro pago → actualizar adeudo → generar auditoría |
| **Componentes (FE)** | Vitest + Testing Library | >= 70% componentes UI | Formulario de pago, tabla de morosos, dashboard métricas |
| **E2E (FE+BE)** | Playwright | Flujos críticos del usuario | Login → registrar pago → descargar comprobante → cerrar sesión |
| **Seguridad** | OWASP ZAP + manual | OWASP Top 10 | SQL injection, XSS, JWT expirado, rutas sin auth, brute-force |
| **Rendimiento** | k6 | < 500ms p95 con 50 usuarios | Endpoint `/api/reportes` bajo carga, carga de dashboard |
| **Accesibilidad** | axe-core | WCAG 2.1 AA | Contraste, navegación teclado, etiquetas ARIA |

## Criterios de Calidad — Definition of Done

* **Cobertura de código:** `>= 80%` en lógica de negocio del backend.
* **Integración Continua:** Todos los tests pasan en CI antes de merge a `main`.
* **Seguridad:** Ninguna vulnerabilidad *High/Critical* reportada por OWASP ZAP.
* **Performance:** `p95 < 500ms` en endpoints críticos bajo 50 usuarios concurrentes.
* **Accesibilidad:** Cero errores de accesibilidad *Level AA* en axe-core.
* **Revisión de código:** Code Review aprobado por al menos 1 integrante del equipo.