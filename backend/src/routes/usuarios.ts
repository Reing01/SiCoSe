import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/require-role.js'
import { auditLogger } from '../services/audit.js'
import type { AuthenticatedRequest } from '../types/auth.js'

function getRequestIp(request: AuthenticatedRequest) {
  return request.ip || request.socket.remoteAddress || 'unknown'
}

const SALT_ROUNDS = 10

const ROLES = ['admin', 'tesorero', 'secretaria'] as const

const listQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  rol: z.enum(ROLES).optional(),
})

const usuarioSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  nombre: z.string().trim().min(2),
  rol: z.enum(ROLES),
})

const updateUsuarioSchema = z
  .object({
    email: z.string().trim().email(),
    nombre: z.string().trim().min(2),
    rol: z.enum(ROLES),
    activo: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

const usuarioSelect = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  activo: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UsuarioSelect

export const usuariosRouter = Router()

usuariosRouter.use(authenticate)
usuariosRouter.use(requireRole('admin'))

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id
}

usuariosRouter.get('/', async (request, response, next) => {
  try {
    const parsed = listQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid usuarios query',
        details: parsed.error.flatten(),
      })
    }

    const { pagina, limite, rol } = parsed.data
    const where: Prisma.UsuarioWhereInput = rol ? { rol } : {}

    const [total, usuarios] = await prisma.$transaction([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        select: usuarioSelect,
        orderBy: [{ nombre: 'asc' }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ])

    return response.json({
      data: usuarios,
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

usuariosRouter.get('/:id', async (request, response, next) => {
  try {
    const usuarioId = getParamId(request.params.id)

    if (!usuarioId) {
      return response.status(400).json({
        error: 'Missing usuario id',
        code: 400,
      })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: usuarioSelect,
    })

    if (!usuario) {
      return response.status(404).json({
        error: 'User not found',
        code: 404,
      })
    }

    return response.json({ data: usuario })
  } catch (error) {
    next(error)
  }
})

usuariosRouter.post('/', async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = usuarioSchema.safeParse(request.body)

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid usuario payload',
        details: parsed.error.flatten(),
      })
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS)

    const usuario = await prisma.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          email: parsed.data.email,
          nombre: parsed.data.nombre,
          rol: parsed.data.rol,
          passwordHash,
          activo: true,
        },
        select: usuarioSelect,
      })

      await auditLogger(tx, {
        usuarioId: request.user!.id,
        accion: 'CREAR_USUARIO',
        entidad: 'Usuario',
        entidadId: created.id,
        detalles: { email: created.email, rol: created.rol },
        ip: getRequestIp(request),
      })

      return created
    })

    return response.status(201).json({
      message: 'User created',
      data: usuario,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return response.status(409).json({
        error: 'Ya existe un usuario con ese correo',
        code: 409,
        details: error.meta,
      })
    }

    next(error)
  }
})

usuariosRouter.put('/:id', async (request: AuthenticatedRequest, response, next) => {
  try {
    const usuarioId = getParamId(request.params.id)
    const parsed = updateUsuarioSchema.safeParse(request.body)

    if (!usuarioId) {
      return response.status(400).json({
        error: 'Missing usuario id',
        code: 400,
      })
    }

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid usuario payload',
        details: parsed.error.flatten(),
      })
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id: usuarioId },
        data: parsed.data,
        select: usuarioSelect,
      })

      await auditLogger(tx, {
        usuarioId: request.user!.id,
        accion: 'ACTUALIZAR_USUARIO',
        entidad: 'Usuario',
        entidadId: updated.id,
        detalles: parsed.data,
        ip: getRequestIp(request),
      })

      return updated
    })

    return response.json({
      message: 'User updated',
      data: usuario,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return response.status(404).json({
        error: 'User not found',
        code: 404,
      })
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return response.status(409).json({
        error: 'Ya existe un usuario con ese correo',
        code: 409,
        details: error.meta,
      })
    }

    next(error)
  }
})

usuariosRouter.delete('/:id', async (request: AuthenticatedRequest, response, next) => {
  try {
    const usuarioId = getParamId(request.params.id)

    if (!usuarioId) {
      return response.status(400).json({
        error: 'Missing usuario id',
        code: 400,
      })
    }

    if (usuarioId === request.user!.id) {
      return response.status(400).json({
        error: 'Cannot deactivate your own account',
        code: 400,
      })
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const deactivated = await tx.usuario.update({
        where: { id: usuarioId },
        data: { activo: false },
        select: usuarioSelect,
      })

      await auditLogger(tx, {
        usuarioId: request.user!.id,
        accion: 'DESACTIVAR_USUARIO',
        entidad: 'Usuario',
        entidadId: deactivated.id,
        ip: getRequestIp(request),
      })

      return deactivated
    })

    return response.json({
      message: 'User deactivated',
      data: usuario,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return response.status(404).json({
        error: 'User not found',
        code: 404,
      })
    }

    next(error)
  }
})
