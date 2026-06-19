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
