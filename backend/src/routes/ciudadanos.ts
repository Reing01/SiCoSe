import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/require-role.js'

const listQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  zona: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
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

const updateCiudadanoSchema = ciudadanoSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field is required',
  },
)

export const ciudadanosRouter = Router()

ciudadanosRouter.use(authenticate)

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id
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

    const { pagina, limite, zona, nombre } = parsed.data
    const where: Prisma.CiudadanoWhereInput = {
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
  requireRole('admin'),
  async (request, response, next) => {
    try {
      const parsed = ciudadanoSchema.safeParse(request.body)

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid ciudadano payload',
          details: parsed.error.flatten(),
        })
      }

      const ciudadano = await prisma.ciudadano.create({
        data: {
          ...parsed.data,
          activo: true,
        },
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
  requireRole('admin'),
  async (request, response, next) => {
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

      const ciudadano = await prisma.ciudadano.update({
        where: {
          id: ciudadanoId,
        },
        data: parsed.data,
      })

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
  requireRole('admin'),
  async (request, response, next) => {
    try {
      const ciudadanoId = getParamId(request.params.id)

      if (!ciudadanoId) {
        return response.status(400).json({
          error: 'Missing ciudadano id',
          code: 400,
        })
      }

      const ciudadano = await prisma.ciudadano.update({
        where: {
          id: ciudadanoId,
        },
        data: {
          activo: false,
        },
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
