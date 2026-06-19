import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/require-role.js'
import { generateMonthlyDebts } from '../services/adeudos.js'

const generateDebtsSchema = z.object({
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  vencimiento: z.coerce.date().optional(),
})

const morososQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  zona: z.string().trim().min(1).optional(),
  servicio_id: z.string().uuid().optional(),
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
})

const PAGE_SIZE = 100

export const adeudosRouter = Router()

adeudosRouter.use(authenticate)

function buildPeriodFilter(year?: number, month?: number) {
  if (!year && !month) {
    return undefined
  }

  if (year && month) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  if (year) {
    return {
      startsWith: `${year}-`,
    }
  }

  return {
    endsWith: `-${String(month).padStart(2, '0')}`,
  }
}

function buildMorososWhere(input: z.infer<typeof morososQuerySchema>) {
  const periodFilter = buildPeriodFilter(input.anio, input.mes)
  const where: Prisma.AdeudoWhereInput = {
    pagado: false,
    OR: [
      {
        estado: 'vencido',
      },
      {
        vencimiento: {
          lt: new Date(),
        },
      },
    ],
  }

  if (input.servicio_id) {
    where.servicioId = input.servicio_id
  }

  if (periodFilter) {
    where.periodo = periodFilter
  }

  if (input.zona) {
    where.ciudadano = {
      zona: {
        contains: input.zona,
        mode: 'insensitive',
      },
    }
  }

  return where
}

adeudosRouter.post(
  '/generar',
  requireRole('admin', 'tesorero'),
  async (request, response, next) => {
    try {
      const parsed = generateDebtsSchema.safeParse(request.body ?? {})

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid debt generation payload',
          details: parsed.error.flatten(),
        })
      }

      const result = await generateMonthlyDebts(parsed.data)

      return response.status(201).json({
        message: 'Monthly debts generated',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  },
)

adeudosRouter.get(
  '/morosos',
  requireRole('admin', 'tesorero', 'secretaria'),
  async (request, response, next) => {
    try {
      const parsed = morososQuerySchema.safeParse(request.query)

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid morosos query',
          details: parsed.error.flatten(),
        })
      }

      const { pagina } = parsed.data
      const where = buildMorososWhere(parsed.data)

      const [total, cartera, adeudos] = await prisma.$transaction([
        prisma.adeudo.count({ where }),
        prisma.adeudo.aggregate({
          where,
          _sum: {
            monto: true,
          },
        }),
        prisma.adeudo.findMany({
          where,
          include: {
            ciudadano: true,
            servicio: true,
          },
          orderBy: {
            monto: 'desc',
          },
          skip: (pagina - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      ])

      const totalCarteraVencida = cartera._sum.monto ?? 0
      response.setHeader('X-Total-Cartera-Vencida', String(totalCarteraVencida))

      return response.json({
        data: adeudos,
        metadata: {
          total,
          pagina,
          limite: PAGE_SIZE,
          totalPaginas: Math.ceil(total / PAGE_SIZE),
          totalCarteraVencida,
        },
      })
    } catch (error) {
      next(error)
    }
  },
)
