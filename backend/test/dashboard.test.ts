import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { getDashboardMetrics as getDashboardMetricsType } from '../src/services/dashboard.js'

let getDashboardMetrics: typeof getDashboardMetricsType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ getDashboardMetrics } = await import('../src/services/dashboard.js'))
})

function createDashboardClient() {
  return {
    pago: {
      aggregate: async (args: { where: { fecha: { gte: Date } } }) => {
        const month = args.where.fecha.gte.getMonth()

        return {
          _sum: {
            monto: month === 5 ? 1250 : 1000,
          },
        }
      },
      count: async () => 7,
    },
    adeudo: {
      count: async (args: { where: { OR?: unknown } }) => (args.where.OR ? 8 : 10),
      groupBy: async () => [
        { ciudadanoId: 'ciudadano-1' },
        { ciudadanoId: 'ciudadano-2' },
      ],
    },
  }
}

function createMemoryCache(seed?: string) {
  const values = new Map<string, string>()
  const writes: Array<{ key: string; value: string; ttl: number }> = []

  if (seed) {
    values.set('dashboard:metricas:2026-06', seed)
  }

  return {
    writes,
    run: async <T>(operation: (redis: {
      get(key: string): Promise<string | null>
      set(key: string, value: string, mode: 'EX', ttl: number): Promise<string>
    }) => Promise<T>) =>
      operation({
        get: async (key) => values.get(key) ?? null,
        set: async (key, value, _mode, ttl) => {
          values.set(key, value)
          writes.push({ key, value, ttl })
          return 'OK'
        },
      }),
  }
}

describe('getDashboardMetrics', () => {
  it('calculates six KPI values and stores them in Redis for five minutes', async () => {
    const cache = createMemoryCache()

    const result = await getDashboardMetrics(
      createDashboardClient() as never,
      new Date('2026-06-18T12:00:00.000Z'),
      cache.run as never,
    )

    assert.equal(result.periodo, '2026-06')
    assert.equal(result.totalRecaudadoMes, 1250)
    assert.equal(result.porcentajeCobertura, 80)
    assert.equal(result.numeroMorosos, 2)
    assert.equal(result.comparativoMesAnterior, 25)
    assert.equal(result.totalAdeudosMes, 10)
    assert.equal(result.pagosRegistradosMes, 7)
    assert.equal(result.variacion.direccion, 'mejora')
    assert.equal(result.variacion.color, 'verde')
    assert.equal(result.cache.hit, false)
    assert.equal(cache.writes[0].key, 'dashboard:metricas:2026-06')
    assert.equal(cache.writes[0].ttl, 300)
  })

  it('returns cached metrics when Redis has a value', async () => {
    const cached = {
      periodo: '2026-06',
      totalRecaudadoMes: 900,
      porcentajeCobertura: 60,
      numeroMorosos: 4,
      comparativoMesAnterior: -10,
      totalAdeudosMes: 20,
      pagosRegistradosMes: 3,
      variacion: {
        direccion: 'empeora',
        color: 'rojo',
        montoMesAnterior: 1000,
      },
      ultimaActualizacion: '2026-06-18T00:00:00.000Z',
    }
    const cache = createMemoryCache(JSON.stringify(cached))

    const result = await getDashboardMetrics(
      createDashboardClient() as never,
      new Date('2026-06-18T12:00:00.000Z'),
      cache.run as never,
    )

    assert.equal(result.totalRecaudadoMes, 900)
    assert.equal(result.cache.hit, true)
    assert.equal(result.cache.ttlSegundos, 300)
    assert.equal(cache.writes.length, 0)
  })
})
