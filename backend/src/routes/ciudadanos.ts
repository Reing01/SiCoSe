import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireResource } from '../middleware/require-role.js'
import { auditLogger } from '../services/audit.js'
import type { AuthenticatedRequest } from '../types/auth.js'

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }

  return value
}, z.boolean())

const listQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  zona: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  incluir_inactivos: booleanQuerySchema,
})

const historyQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  servicio_id: z.string().uuid().optional(),
  estado: z.string().trim().min(1).optional(),
})

const ciudadanoSchema = z.object({
  nombre: z.string().trim().min(2),
  apellido: z.string().trim().min(2),
  email: z.string().trim().email(),
  telefono: z.string().trim().min(7).optional(),
  direccion: z.string().trim().min(3).optional(),
  zona: z.string().trim().min(2).optional(),
  clave_catastral: z.string().trim().min(3),
})

const updateCiudadanoSchema = ciudadanoSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const ciudadanosRouter = Router()

ciudadanosRouter.use(authenticate)

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id
}

function getRequestIp(request: AuthenticatedRequest) {
  return request.ip || request.socket.remoteAddress || 'unknown'
}

ciudadanosRouter.get('/', async (request, response, next) => {
  try {
    const parsed = listQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid ciudadanos query',
        details: parsed.error.flatten(),
      })
    }

    const { pagina, limite, zona, nombre, incluir_inactivos } = parsed.data
    const where: Prisma.CiudadanoWhereInput = incluir_inactivos
      ? {}
      : {
          activo: true,
        }

    if (zona) {
      where.zona = {
        contains: zona,
        mode: 'insensitive',
      }
    }

    if (nombre) {
      where.OR = [
        {
          nombre: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        {
          apellido: {
            contains: nombre,
            mode: 'insensitive',
          },
        },
        {
          clave_catastral: nombre,
        },
      ]
    }

    const [total, ciudadanos] = await prisma.$transaction([
      prisma.ciudadano.count({ where }),
      prisma.ciudadano.findMany({
        where,
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ])

    return response.json({
      data: ciudadanos,
      metadata: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    })
  } catch (error) {
    next(error)
  }
})

ciudadanosRouter.get('/:id/historial', async (request, response, next) => {
  try {
    const ciudadanoId = getParamId(request.params.id)
    const parsed = historyQuerySchema.safeParse(request.query)

    if (!ciudadanoId) {
      return response.status(400).json({
        error: 'Missing ciudadano id',
        code: 400,
      })
    }

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid citizen history query',
        details: parsed.error.flatten(),
      })
    }

    const ciudadano = await prisma.ciudadano.findUnique({
      where: { id: ciudadanoId },
      select: { id: true },
    })

    if (!ciudadano) {
      return response.status(404).json({
        error: 'Ciudadano not found',
        code: 404,
      })
    }

    const { anio, servicio_id, estado } = parsed.data
    const dateFilter = anio
      ? {
          gte: new Date(Date.UTC(anio, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(anio + 1, 0, 1, 0, 0, 0, 0)),
        }
      : undefined
    const periodFilter = anio ? { startsWith: `${anio}-` } : undefined

    const adeudoWhere: Prisma.AdeudoWhereInput = {
      ciudadanoId,
      ...(servicio_id ? { servicioId: servicio_id } : {}),
      ...(estado ? { estado } : {}),
      ...(periodFilter ? { periodo: periodFilter } : {}),
    }
    const pagoAdeudoWhere: Prisma.AdeudoWhereInput = {
      ...(servicio_id ? { servicioId: servicio_id } : {}),
      ...(estado ? { estado } : {}),
    }
    const pagoWhere: Prisma.PagoWhereInput = {
      ciudadanoId,
      ...(Object.keys(pagoAdeudoWhere).length > 0
        ? { adeudo: pagoAdeudoWhere }
        : {}),
      ...(dateFilter ? { fecha: dateFilter } : {}),
    }

    const [adeudos, pagos] = await prisma.$transaction([
      prisma.adeudo.findMany({
        where: adeudoWhere,
        include: { servicio: true },
        orderBy: { vencimiento: 'desc' },
      }),
      prisma.pago.findMany({
        where: pagoWhere,
        include: {
          adeudo: {
            include: {
              servicio: true,
            },
          },
          comprobantes: true,
        },
        orderBy: { fecha: 'desc' },
      }),
    ])

    const historial = [
      ...adeudos.map((adeudo) => ({
        tipo: 'adeudo' as const,
        fecha: adeudo.vencimiento,
        data: adeudo,
      })),
      ...pagos.map((pago) => ({
        tipo: 'pago' as const,
        fecha: pago.fecha,
        data: pago,
      })),
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime())

    return response.json({
      data: {
        ciudadanoId,
        adeudos,
        pagos,
        historial,
      },
      metadata: {
        totalAdeudos: adeudos.length,
        totalPagos: pagos.length,
        totalMovimientos: historial.length,
        filtros: parsed.data,
      },
    })
  } catch (error) {
    next(error)
  }
})

ciudadanosRouter.get('/:id', async (request, response, next) => {
  try {
    const ciudadanoId = getParamId(request.params.id)

    if (!ciudadanoId) {
      return response.status(400).json({
        error: 'Missing ciudadano id',
        code: 400,
      })
    }

    const ciudadano = await prisma.ciudadano.findFirst({
      where: {
        id: ciudadanoId,
        activo: true,
      },
      include: {
        adeudos: {
          include: {
            servicio: true,
          },
          orderBy: {
            vencimiento: 'desc',
          },
        },
        pagos: {
          orderBy: {
            fecha: 'desc',
          },
        },
        comprobantes: {
          orderBy: {
            fecha: 'desc',
          },
        },
        reportes: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    })

    if (!ciudadano) {
      return response.status(404).json({
        error: 'Ciudadano not found',
        code: 404,
      })
    }

    return response.json({
      data: ciudadano,
    })
  } catch (error) {
    next(error)
  }
})

ciudadanosRouter.post(
  '/',
  requireResource('ciudadanos'),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = ciudadanoSchema.safeParse(request.body)

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid ciudadano payload',
          details: parsed.error.flatten(),
        })
      }

      const inactiveCitizen = await prisma.ciudadano.findFirst({
        where: {
          activo: false,
          OR: [
            { email: parsed.data.email },
            { clave_catastral: parsed.data.clave_catastral },
          ],
        },
        select: {
          id: true,
          email: true,
          clave_catastral: true,
        },
      })

      if (inactiveCitizen) {
        return response.status(409).json({
          error: 'Ciudadano exists but is inactive',
          code: 'CIUDADANO_INACTIVO_EXISTS',
          data: inactiveCitizen,
        })
      }

      const ciudadano = await prisma.$transaction(async (tx) => {
        const created = await tx.ciudadano.create({
          data: {
            ...parsed.data,
            activo: true,
          },
        })

        await auditLogger(tx, {
          usuarioId: request.user?.id ?? '',
          accion: 'ALTA_CIUDADANO',
          entidad: 'Ciudadano',
          entidadId: created.id,
          ip: getRequestIp(request),
          detalles: {
            email: created.email,
            claveCatastral: created.clave_catastral,
            zona: created.zona,
          },
        })

        return created
      })

      return response.status(201).json({
        message: 'Ciudadano created',
        data: ciudadano,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return response.status(409).json({
          error: 'Ciudadano already exists',
          code: 409,
          details: error.meta,
        })
      }

      next(error)
    }
  },
)

ciudadanosRouter.put(
  '/:id',
  requireResource('ciudadanos'),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const ciudadanoId = getParamId(request.params.id)
      const parsed = updateCiudadanoSchema.safeParse(request.body)

      if (!ciudadanoId) {
        return response.status(400).json({
          error: 'Missing ciudadano id',
          code: 400,
        })
      }

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid ciudadano payload',
          details: parsed.error.flatten(),
        })
      }

      const ciudadano = await prisma.$transaction(async (tx) => {
        const previous = await tx.ciudadano.findUnique({
          where: { id: ciudadanoId },
        })

        if (!previous) {
          return null
        }

        const updated = await tx.ciudadano.update({
          where: {
            id: ciudadanoId,
          },
          data: parsed.data,
        })

        await auditLogger(tx, {
          usuarioId: request.user?.id ?? '',
          accion: 'ACTUALIZACION_CIUDADANO',
          entidad: 'Ciudadano',
          entidadId: ciudadanoId,
          ip: getRequestIp(request),
          detalles: {
            cambios: parsed.data,
            estadoAnterior: previous.activo ? 'activo' : 'inactivo',
            estadoNuevo: updated.activo ? 'activo' : 'inactivo',
          },
        })

        return updated
      })

      if (!ciudadano) {
        return response.status(404).json({
          error: 'Ciudadano not found',
          code: 404,
        })
      }

      return response.json({
        message: 'Ciudadano updated',
        data: ciudadano,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return response.status(404).json({
          error: 'Ciudadano not found',
          code: 404,
        })
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return response.status(409).json({
          error: 'Ciudadano already exists',
          code: 409,
          details: error.meta,
        })
      }

      next(error)
    }
  },
)

ciudadanosRouter.put(
  '/:id/desactivar',
  requireResource('ciudadanos'),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const ciudadanoId = getParamId(request.params.id)

      if (!ciudadanoId) {
        return response.status(400).json({
          error: 'Missing ciudadano id',
          code: 400,
        })
      }

      const ciudadano = await prisma.$transaction(async (tx) => {
        const updated = await tx.ciudadano.update({
          where: {
            id: ciudadanoId,
          },
          data: {
            activo: false,
          },
        })

        await auditLogger(tx, {
          usuarioId: request.user?.id ?? '',
          accion: 'DESACTIVACION_CIUDADANO',
          entidad: 'Ciudadano',
          entidadId: ciudadanoId,
          ip: getRequestIp(request),
          detalles: {
            email: updated.email,
            claveCatastral: updated.clave_catastral,
            estadoNuevo: 'inactivo',
          },
        })

        return updated
      })

      return response.json({
        message: 'Ciudadano deactivated',
        data: ciudadano,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return response.status(404).json({
          error: 'Ciudadano not found',
          code: 404,
        })
      }

      next(error)
    }
  },
)
