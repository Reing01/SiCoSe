import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

type PrismaClientLike = Pick<typeof prisma, 'ciudadano' | 'servicio' | 'adeudo' | '$transaction'>

export type GenerateMonthlyDebtsInput = {
  periodo?: string
  vencimiento?: Date
}

export type GeneratedDebtItem = {
  ciudadanoId: string
  servicioId: string
  monto: number
  periodo: string
  vencimiento: Date
}

export type ListPendingDebtsInput = {
  pagina?: number
  limite?: number
  ciudadanoId?: string
  zona?: string
  servicioId?: string
  anio?: number
  mes?: number
  estado?: string
}

function getCurrentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getDefaultDueDate(periodo: string) {
  const [yearText, monthText] = periodo.split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
}

function normalizePeriod(periodo?: string) {
  const normalized = periodo?.trim() || getCurrentPeriod()

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)) {
    throw new Error('Invalid period format. Expected YYYY-MM')
  }

  return normalized
}

export async function generateMonthlyDebts(
  input: GenerateMonthlyDebtsInput = {},
  client: PrismaClientLike = prisma,
) {
  const periodo = normalizePeriod(input.periodo)
  const vencimiento = input.vencimiento ?? getDefaultDueDate(periodo)

  return client.$transaction(async (tx) => {
    const [ciudadanos, servicios, existingDebts] = await Promise.all([
      tx.ciudadano.findMany({
        where: { activo: true },
        select: { id: true },
      }),
      tx.servicio.findMany({
        select: {
          id: true,
          tarifa: true,
        },
      }),
      tx.adeudo.findMany({
        where: { periodo },
        select: {
          ciudadanoId: true,
          servicioId: true,
        },
      }),
    ])

    const existingKeys = new Set(
      existingDebts.map((debt) => `${debt.ciudadanoId}:${debt.servicioId}`),
    )
    const data: Prisma.AdeudoCreateManyInput[] = []

    for (const ciudadano of ciudadanos) {
      for (const servicio of servicios) {
        const key = `${ciudadano.id}:${servicio.id}`

        if (!existingKeys.has(key)) {
          data.push({
            ciudadanoId: ciudadano.id,
            servicioId: servicio.id,
            monto: servicio.tarifa,
            periodo,
            vencimiento,
            pagado: false,
            estado: 'pendiente',
          })
        }
      }
    }

    if (data.length > 0) {
      await tx.adeudo.createMany({
        data,
        skipDuplicates: true,
      })
    }

    return {
      periodo,
      vencimiento,
      ciudadanosActivos: ciudadanos.length,
      serviciosActivos: servicios.length,
      candidatos: ciudadanos.length * servicios.length,
      existentes: existingDebts.length,
      creados: data.length,
      omitidos: existingDebts.length,
    }
  })
}

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

export async function listPendingDebts(
  input: ListPendingDebtsInput = {},
  client: Pick<typeof prisma, 'adeudo' | '$transaction'> = prisma,
) {
  const pagina = input.pagina ?? 1
  const limite = input.limite ?? 20
  const periodFilter = buildPeriodFilter(input.anio, input.mes)
  const where: Prisma.AdeudoWhereInput = {
    pagado: false,
    NOT: {
      estado: 'pagado',
    },
  }

  if (input.estado) {
    where.estado = input.estado
  }

  if (input.ciudadanoId) {
    where.ciudadanoId = input.ciudadanoId
  }

  if (input.servicioId) {
    where.servicioId = input.servicioId
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

  const [total, cartera, adeudos] = await client.$transaction([
    client.adeudo.count({ where }),
    client.adeudo.aggregate({
      where,
      _sum: {
        monto: true,
      },
    }),
    client.adeudo.findMany({
      where,
      include: {
        ciudadano: true,
        servicio: true,
      },
      orderBy: [{ vencimiento: 'asc' }, { created_at: 'desc' }],
      skip: (pagina - 1) * limite,
      take: limite,
    }),
  ])

  return {
    data: adeudos,
    metadata: {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      totalPendiente: cartera._sum.monto ?? 0,
    },
  }
}
