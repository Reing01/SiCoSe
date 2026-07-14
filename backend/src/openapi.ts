export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SiCoSe API',
    version: '1.0.0',
    description:
      'API del Sistema de Cobro y Seguimiento para autenticación, ciudadanos, pagos, adeudos, auditorías y reportes.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health' },
    { name: 'Leads' },
    { name: 'Auth' },
    { name: 'Ciudadanos' },
    { name: 'Adeudos' },
    { name: 'Dashboard' },
    { name: 'Pagos' },
    { name: 'Reportes' },
    { name: 'Auditorias' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'integer' },
          details: { type: 'object', additionalProperties: true },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          service: { type: 'string', example: 'sicose-backend' },
          status: { type: 'string', example: 'ready' },
          uptimeSeconds: { type: 'integer', example: 42 },
          timestamp: { type: 'string', format: 'date-time' },
          layers: {
            type: 'array',
            items: { type: 'string' },
          },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
                  latencyMs: { type: 'integer' },
                  error: { type: 'string', nullable: true },
                },
              },
              redis: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean' },
                  latencyMs: { type: 'integer' },
                  error: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
      LivenessResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          status: { type: 'string', example: 'alive' },
          service: { type: 'string', example: 'sicose-backend' },
          uptimeSeconds: { type: 'integer', example: 42 },
          timestamp: { type: 'string', format: 'date-time' },
          layers: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      LeadInput: {
        type: 'object',
        required: ['nombre', 'comite', 'contacto'],
        properties: {
          nombre: { type: 'string', example: 'Cristian Pérez' },
          comite: { type: 'string', example: 'Junta Auxiliar San Diego Chalma' },
          contacto: { type: 'string', example: 'cristian@sicose.test' },
        },
      },
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          nombre: { type: 'string' },
          rol: { type: 'string', example: 'admin' },
        },
      },
      Ciudadano: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
          apellido: { type: 'string' },
          email: { type: 'string', format: 'email' },
          telefono: { type: 'string', nullable: true },
          direccion: { type: 'string', nullable: true },
          zona: { type: 'string', nullable: true },
          clave_catastral: { type: 'string' },
          activo: { type: 'boolean' },
        },
      },
      Adeudo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ciudadanoId: { type: 'string', format: 'uuid' },
          servicioId: { type: 'string', format: 'uuid' },
          monto: { type: 'number' },
          periodo: { type: 'string', example: '2026-06' },
          vencimiento: { type: 'string', format: 'date-time' },
          pagado: { type: 'boolean' },
          estado: { type: 'string' },
        },
      },
      Pago: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ciudadanoId: { type: 'string', format: 'uuid' },
          adeudoId: { type: 'string', format: 'uuid' },
          monto: { type: 'number' },
          metodo: { type: 'string' },
          folio: { type: 'string' },
          recibo: { type: 'string' },
          creado_por: { type: 'string', nullable: true },
        },
      },
      Reporte: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          titulo: { type: 'string' },
          tipo: { type: 'string' },
          estado: { type: 'string' },
          periodo: { type: 'string' },
          archivo_url: { type: 'string' },
          archivo_path: { type: 'string' },
        },
      },
      ReportExportRequest: {
        type: 'object',
        properties: {
          periodo: { type: 'string', example: '2026-06' },
          formato: { type: 'string', enum: ['pdf', 'xlsx'], example: 'xlsx' },
        },
      },
      Auditoria: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          accion: { type: 'string' },
          entidad: { type: 'string' },
          entidad_id: { type: 'string' },
          detalles: { type: 'string', nullable: true },
          ip: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          503: {
            description: 'Service is not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        responses: {
          200: {
            description: 'Service process is alive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LivenessResponse' },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        responses: {
          200: {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          503: {
            description: 'Service is not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check alias',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          503: {
            description: 'Service is not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/leads': {
      post: {
        tags: ['Leads'],
        summary: 'Register a public lead',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LeadInput' },
            },
          },
        },
        responses: {
          201: { description: 'Lead created' },
          400: {
            description: 'Invalid payload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          400: {
            description: 'Invalid payload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          429: {
            description: 'Rate limited',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user profile',
        responses: {
          200: { description: 'Authenticated user profile' },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and blacklist token',
        responses: {
          200: { description: 'Logout successful' },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/ciudadanos': {
      get: {
        tags: ['Ciudadanos'],
        summary: 'List active citizens with pagination and search',
        responses: { 200: { description: 'Paginated citizens' } },
      },
      post: {
        tags: ['Ciudadanos'],
        summary: 'Create a citizen',
        responses: {
          201: { description: 'Citizen created' },
          400: { description: 'Invalid payload' },
          409: { description: 'Citizen already exists' },
        },
      },
    },
    '/api/ciudadanos/{id}': {
      get: {
        tags: ['Ciudadanos'],
        summary: 'Citizen detail by id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Citizen detail' },
          404: { description: 'Citizen not found' },
        },
      },
      put: {
        tags: ['Ciudadanos'],
        summary: 'Update citizen data',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Citizen updated' },
          400: { description: 'Invalid payload' },
          404: { description: 'Citizen not found' },
          409: { description: 'Citizen already exists' },
        },
      },
    },
    '/api/ciudadanos/{id}/desactivar': {
      put: {
        tags: ['Ciudadanos'],
        summary: 'Soft delete citizen',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Citizen deactivated' },
          404: { description: 'Citizen not found' },
        },
      },
    },
    '/api/adeudos/generar': {
      post: {
        tags: ['Adeudos'],
        summary: 'Generate monthly debts',
        responses: {
          201: { description: 'Debts generated' },
          400: { description: 'Invalid payload' },
          403: { description: 'Forbidden role' },
        },
      },
    },
    '/api/adeudos/morosos': {
      get: {
        tags: ['Adeudos'],
        summary: 'List overdue debts',
        responses: {
          200: { description: 'Overdue debts' },
          400: { description: 'Invalid query' },
          403: { description: 'Forbidden role' },
        },
      },
    },
    '/api/dashboard/metricas': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard metrics',
        responses: {
          200: { description: 'Dashboard metrics' },
          403: { description: 'Forbidden role' },
        },
      },
    },
    '/api/pagos': {
      post: {
        tags: ['Pagos'],
        summary: 'Register a cash or transfer payment',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object' },
            },
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          201: { description: 'Payment created' },
          400: { description: 'Invalid payment payload' },
          403: { description: 'Forbidden role' },
          409: { description: 'Debt already paid' },
        },
      },
    },
    '/api/pagos/{id}/recibo': {
      get: {
        tags: ['Pagos'],
        summary: 'Download or preview a payment receipt PDF',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Receipt PDF',
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
          },
          404: { description: 'Receipt not found' },
        },
      },
    },
    '/api/reportes/generar': {
      post: {
        tags: ['Reportes'],
        summary: 'Generate a monthly PDF report',
        responses: {
          201: { description: 'Report generated' },
          400: { description: 'Invalid payload' },
          403: { description: 'Forbidden role' },
        },
      },
    },
    '/api/reportes/exportar': {
      post: {
        tags: ['Reportes'],
        summary: 'Export a monthly report as PDF or Excel',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportExportRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Report export generated' },
          400: { description: 'Invalid payload' },
          403: { description: 'Forbidden role' },
        },
      },
    },
    '/api/auditorias': {
      get: {
        tags: ['Auditorias'],
        summary: 'List critical audit entries',
        responses: {
          200: { description: 'Audit entries' },
          400: { description: 'Invalid query' },
          403: { description: 'Forbidden role' },
        },
      },
    },
  },
} as const
