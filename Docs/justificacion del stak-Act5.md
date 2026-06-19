## 3. Justificación del Stack Tecnológico

El stack fue elegido priorizando:
(a) lenguaje unificado **TypeScript** para reducir la curva de aprendizaje del equipo,
(b) ecosistemas maduros con amplia documentación,
(c) opciones de despliegue gratuitas o de bajo costo para MVP, y
(d) escalabilidad horizontal sin rediseño de arquitectura.

### Tecnologías Seleccionadas

| Tecnología              | Capa             | Justificación                                                                 | Versión          |
|-------------------------|------------------|-------------------------------------------------------------------------------|------------------|
| React + TypeScript      | Frontend         | Ecosistema maduro, tipado fuerte para evitar errores en producción, soporte de componentes reutilizables | 18.3 / 5.4       |
| Vite                    | Frontend         | Bundler ultrarrápido, HMR eficiente para desarrollo, tree-shaking optimizado   | 5.x              |
| TailwindCSS + shadcn/ui | Frontend         | Sistema de diseño consistente, componentes accesibles, prototipado rápido sin CSS excesivo | 3.x / latest     |
| Node.js + Express 5     | Backend          | Ecosistema JS unificado con frontend, alta concurrencia I/O, amplia comunidad y librerías | 20 LTS / 5.x     |
| Prisma ORM              | Backend / DB     | Tipado seguro con la BD, migraciones automáticas, previene SQL injection por defecto | 5.x              |
| PostgreSQL              | Base de datos    | ACID compliant, soporte JSON, índices parciales, ideal para reportes financieros con integridad | 16               |
| Redis                   | Caché / Sesiones | Caché de consultas frecuentes, blacklist de JWT revocados, rate limiting distribuido | 7.x              |
| JWT + Bcrypt            | Seguridad        | Autenticación stateless escalable; Bcrypt factor 12 para hash de contraseñas robusto | RFC 7519 / 2b    |
| GitHub Actions          | CI/CD            | Automatización de pruebas en cada PR, despliegue continuo, integración nativa con el repositorio | latest           |
| Railway / Vercel        | Infraestructura  | Despliegue sin servidor dedicado, SSL automático, escalado horizontal, plan gratuito para MVP | SaaS             |

---

## 3.1 Escalabilidad y Decisiones Técnicas

- **UUID v4 como IDs**
  Evita enumeración de registros en URLs. Permite distribuir la generación de IDs sin coordinación central, facilitando sharding futuro.

- **Monolito Modular (no microservicios)**
  Para el MVP con un equipo de 4 personas, el monolito reduce complejidad operativa. La arquitectura por módulos (`auth/`, `ciudadanos/`, `pagos/`, `reportes/`) permite extraer servicios cuando el volumen lo justifique.

- **Prisma con migraciones versionadas**
  Schema en código fuente, historial de cambios en git, reproducible en cualquier ambiente. Elimina el riesgo de inconsistencia entre ambientes de desarrollo y producción.

- **React Query para caché del cliente**
  Elimina el 80% de re-fetches innecesarios. El dashboard de métricas usa *stale-while-revalidate* para mostrar datos instantáneamente mientras actualiza en background.

- **Soft deletes en lugar de DELETE físico**
  Preservar historial es crítico en un sistema financiero. Ningún registro se elimina físicamente; se marca como inactivo. Facilita auditorías y la trazabilidad requerida por la Junta Auxiliar.

- **Comprobantes con hash SHA256**
  Detecta si un archivo fue alterado post-registro. El hash se guarda en BD y se puede verificar en cualquier momento contra el archivo almacenado en S3.

- **Diseño API RESTful versionada (`/v1/`)**
  Permite publicar cambios *breaking* en `/v2/` sin afectar integraciones existentes. Preparado para futuras integraciones con banca móvil o portales ciudadanos.
