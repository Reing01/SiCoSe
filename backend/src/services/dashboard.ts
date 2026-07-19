import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { withRedis } from '../lib/redis.js'

const DASHBOARD_CACHE_TTL_SECONDS = 300

type PrismaClientLike = Pick<typeof prisma, 'pago' | 'adeudo'>
type RedisCache = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>
}

export type DashboardMetrics = {
  periodo: string
  totalRecaudadoMes: number
  totalPendienteMes: number
  porcentajeCobertura: number
  numeroMorosos: number
  comparativoMesAnterior: number
  totalAdeudosMes: number
  adeudosPagadosMes: number
  pagosRegistradosMes: number
  historicoRecaudacion: Array<{
    periodo: string
    total: number
  }>
  variacion: {
    direccion: 'mejora' | 'empeora' | 'estable'
    color: 'verde' | 'rojo' | 'amarillo'
    montoMesAnterior: number
  }
  ultimaActualizacion: string
  cache: {
    hit: boolean
    ttlSegundos: number
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}

function getPeriodParts(date: Date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  }
}

function buildPeriod(date: Date) {
  const { year, month } = getPeriodParts(date)
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getPreviousPeriod(date: Date) {
  const previous = new Date(date)
  previous.setMonth(previous.getMonth() - 1)
  return buildPeriod(previous)
}

function getMonthRange(date: Date) {
  const { year, month } = getPeriodParts(date)

  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  }
}

function getDashboardCacheKey(periodo: string) {
  return `dashboard:metricas:${periodo}`
}

function getVariation(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return {
      comparativoMesAnterior: 0,
      direccion: 'estable' as const,
      color: 'amarillo' as const,
    }
  }

  if (previous === 0) {
    return {
      comparativoMesAnterior: 100,
      direccion: 'mejora' as const,
      color: 'verde' as const,
    }
  }

  const comparativoMesAnterior = roundPercent(((current - previous) / previous) * 100)

  if (comparativoMesAnterior > 0) {
    return {
      comparativoMesAnterior,
      direccion: 'mejora' as const,
      color: 'verde' as const,
    }
  }

  if (comparativoMesAnterior < 0) {
    return {
      comparativoMesAnterior,
      direccion: 'empeora' as const,
      color: 'rojo' as const,
    }
  }

  return {
    comparativoMesAnterior,
    direccion: 'estable' as const,
    color: 'amarillo' as const,
  }
}

async function calculateDashboardMetrics(
  client: PrismaClientLike,
  date: Date,
): Promise<Omit<DashboardMetrics, 'cache'>> {
  const periodo = buildPeriod(date)
  const previousPeriod = getPreviousPeriod(date)
  const { start, end } = getMonthRange(date)
  const previousDate = new Date(date)
  previousDate.setMonth(previousDate.getMonth() - 1)
  const previousRange = getMonthRange(previousDate)

  const [
    currentPayments,
    previousPayments,
    totalDebts,
    paidDebts,
    pendingDebts,
    debtors,
    paymentsRegistered,
    historicalPayments,
  ] = await Promise.all([
    client.pago.aggregate({
      where: {
        fecha: {
          gte: start,
          lt: end,
        },
      },
      _sum: { monto: true },
    }),
    client.pago.aggregate({
      where: {
        fecha: {
          gte: previousRange.start,
          lt: previousRange.end,
        },
      },
      _sum: { monto: true },
    }),
    client.adeudo.count({
      where: { periodo },
    }),
    client.adeudo.count({
      where: {
        periodo,
        OR: [{ pagado: true }, { estado: 'pagado' }],
      },
    }),
    client.adeudo.aggregate({
      where: {
        periodo,
        pagado: false,
        NOT: {
          estado: 'pagado',
        },
      },
      _sum: {
        monto: true,
      },
    }),
    client.adeudo.groupBy({
      by: ['ciudadanoId'],
      where: {
        periodo,
        pagado: false,
        NOT: {
          estado: 'pagado',
        },
      },
    }),
    client.pago.count({
      where: {
        fecha: {
          gte: start,
          lt: end,
        },
      },
    }),
    Promise.all(
      Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(date)
        monthDate.setMonth(monthDate.getMonth() - (5 - index))
        const range = getMonthRange(monthDate)

        return client.pago.aggregate({
          where: {
            fecha: {
              gte: range.start,
              lt: range.end,
            },
          },
          _sum: { monto: true },
        })
      }),
    ),
  ])

  const totalRecaudadoMes = roundCurrency(currentPayments._sum.monto ?? 0)
  const montoMesAnterior = roundCurrency(previousPayments._sum.monto ?? 0)
  const variation = getVariation(totalRecaudadoMes, montoMesAnterior)

  return {
    periodo,
    totalRecaudadoMes,
    totalPendienteMes: roundCurrency(pendingDebts._sum.monto ?? 0),
    porcentajeCobertura:
      totalDebts === 0 ? 0 : roundPercent((paidDebts / totalDebts) * 100),
    numeroMorosos: debtors.length,
    comparativoMesAnterior: variation.comparativoMesAnterior,
    totalAdeudosMes: totalDebts,
    adeudosPagadosMes: paidDebts,
    pagosRegistradosMes: paymentsRegistered,
    historicoRecaudacion: historicalPayments.map((payment, index) => {
      const monthDate = new Date(date)
      monthDate.setMonth(monthDate.getMonth() - (5 - index))

      return {
        periodo: buildPeriod(monthDate),
        total: roundCurrency(payment._sum.monto ?? 0),
      }
    }),
    variacion: {
      direccion: variation.direccion,
      color: variation.color,
      montoMesAnterior,
    },
    ultimaActualizacion: new Date().toISOString(),
  }
}

export async function getDashboardMetrics(
  client: PrismaClientLike = prisma,
  date = new Date(),
  cache: ((operation: (redis: RedisCache) => Promise<unknown>) => Promise<unknown>) = withRedis,
): Promise<DashboardMetrics> {
  const periodo = buildPeriod(date)
  const cacheKey = getDashboardCacheKey(periodo)

  try {
    const cached = await cache((redis) => redis.get(cacheKey))

    if (typeof cached === 'string') {
      return {
        ...(JSON.parse(cached) as Omit<DashboardMetrics, 'cache'>),
        cache: {
          hit: true,
          ttlSegundos: DASHBOARD_CACHE_TTL_SECONDS,
        },
      }
    }
  } catch {
    // Redis is optional in local development. Metrics are still calculated.
  }

  const metrics = await calculateDashboardMetrics(client, date)

  try {
    await cache((redis) =>
      redis.set(cacheKey, JSON.stringify(metrics), 'EX', DASHBOARD_CACHE_TTL_SECONDS),
    )
  } catch {
    // If Redis is unavailable, the endpoint remains functional without cache.
  }

  return {
    ...metrics,
    cache: {
      hit: false,
      ttlSegundos: DASHBOARD_CACHE_TTL_SECONDS,
    },
  }
}
