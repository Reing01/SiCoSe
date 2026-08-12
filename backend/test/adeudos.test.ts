import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type {
  backfillCitizenWaterDebts as backfillCitizenWaterDebtsType,
  buildMonthlyPeriods as buildMonthlyPeriodsType,
  generateMonthlyDebts as generateMonthlyDebtsType,
} from '../src/services/adeudos.js'

let generateMonthlyDebts: typeof generateMonthlyDebtsType
let backfillCitizenWaterDebts: typeof backfillCitizenWaterDebtsType
let buildMonthlyPeriods: typeof buildMonthlyPeriodsType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({
    generateMonthlyDebts,
    backfillCitizenWaterDebts,
    buildMonthlyPeriods,
  } = await import('../src/services/adeudos.js'))
})

function createDebtGenerationClient() {
  const created = {
    data: undefined as unknown,
  }

  const tx = {
    ciudadano: {
      findMany: async () => [
        { id: 'ciudadano-1' },
        { id: 'ciudadano-2' },
      ],
    },
    servicio: {
      findMany: async () => [
        { id: 'servicio-agua', nombre: 'Agua potable', tarifa: 30 },
        { id: 'servicio-basura', tarifa: 25 },
      ],
    },
    adeudo: {
      findMany: async () => [
        {
          ciudadanoId: 'ciudadano-1',
          servicioId: 'servicio-agua',
        },
      ],
      createMany: async (args: unknown) => {
        created.data = args
        return { count: 3 }
      },
    },
  }

  const client = {
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
  }

  return { client, created }
}

function createBackfillClient() {
  const created = {
    data: undefined as unknown,
  }

  const client = {
    ciudadano: {
      findUnique: async () => ({ id: 'ciudadano-1' }),
    },
    servicio: {
      findMany: async () => [
        { id: 'servicio-agua', nombre: 'Agua potable' },
        { id: 'servicio-basura', nombre: 'Basura' },
      ],
    },
    adeudo: {
      findMany: async () => [
        {
          ciudadanoId: 'ciudadano-1',
          servicioId: 'servicio-agua',
          periodo: '2025-01',
        },
      ],
      createMany: async (args: unknown) => {
        created.data = args
        return { count: 14 }
      },
    },
  }

  return { client, created }
}

describe('generateMonthlyDebts', () => {
  it('generates missing monthly debts and skips existing citizen-service pairs', async () => {
    const { client, created } = createDebtGenerationClient()

    const result = await generateMonthlyDebts(
      {
        periodo: '2026-06',
        vencimiento: new Date('2026-06-30T00:00:00.000Z'),
      },
      client as never,
    )

    assert.equal(result.periodo, '2026-06')
    assert.equal(result.ciudadanosActivos, 2)
    assert.equal(result.serviciosActivos, 1)
    assert.equal(result.candidatos, 2)
    assert.equal(result.existentes, 1)
    assert.equal(result.creados, 1)

    const createManyArgs = created.data as {
      data: Array<{ ciudadanoId: string; servicioId: string; periodo: string }>
      skipDuplicates: boolean
    }

    assert.equal(createManyArgs.skipDuplicates, true)
    assert.deepEqual(
      createManyArgs.data.map((item) => `${item.ciudadanoId}:${item.servicioId}`),
      ['ciudadano-2:servicio-agua'],
    )
    assert.equal(createManyArgs.data.every((item) => item.periodo === '2026-06'), true)
  })

  it('rejects an invalid period format', async () => {
    const { client } = createDebtGenerationClient()

    await assert.rejects(
      generateMonthlyDebts({ periodo: '06-2026' }, client as never),
      {
        name: 'Error',
        message: 'Invalid period format. Expected YYYY-MM',
      },
    )
  })
})

describe('backfillCitizenWaterDebts', () => {
  it('fills the monthly water history from 2025 for a new citizen', async () => {
    const { client, created } = createBackfillClient()

    const result = await backfillCitizenWaterDebts(
      'ciudadano-1',
      client as never,
      {
        startYear: 2025,
        startMonth: 1,
        endDate: new Date('2026-03-15T00:00:00.000Z'),
      },
    )

    assert.equal(result.ciudadanoId, 'ciudadano-1')
    assert.equal(result.periodos, 15)
    assert.equal(result.serviciosActivos, 1)
    assert.equal(result.candidatos, 15)
    assert.equal(result.existentes, 1)
    assert.equal(result.creados, 14)

    const createManyArgs = created.data as {
      data: Array<{ ciudadanoId: string; servicioId: string; periodo: string; monto: number }>
      skipDuplicates: boolean
    }

    assert.equal(createManyArgs.skipDuplicates, true)
    assert.equal(createManyArgs.data.length, 14)
    assert.equal(createManyArgs.data.every((item) => item.monto === 30), true)
    assert.equal(
      createManyArgs.data.some((item) => item.periodo === '2025-01'),
      false,
    )
    assert.equal(
      createManyArgs.data.some((item) => item.periodo === '2026-03'),
      true,
    )
  })
})

describe('buildMonthlyPeriods', () => {
  it('builds a closed range of monthly periods', () => {
    assert.deepEqual(
      buildMonthlyPeriods(2025, 1, new Date('2025-03-10T00:00:00.000Z')),
      ['2025-01', '2025-02', '2025-03'],
    )
  })

  it('rejects invalid start coordinates', () => {
    assert.throws(() => buildMonthlyPeriods(1999, 1), {
      message: 'Invalid start year. Expected a year between 2000 and 2100',
    })
    assert.throws(() => buildMonthlyPeriods(2025, 0), {
      message: 'Invalid start month. Expected a month between 1 and 12',
    })
  })
})
