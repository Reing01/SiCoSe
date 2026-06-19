import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { generateMonthlyDebts as generateMonthlyDebtsType } from '../src/services/adeudos.js'

let generateMonthlyDebts: typeof generateMonthlyDebtsType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ generateMonthlyDebts } = await import('../src/services/adeudos.js'))
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
        { id: 'servicio-agua', tarifa: 45.5 },
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
    assert.equal(result.serviciosActivos, 2)
    assert.equal(result.candidatos, 4)
    assert.equal(result.existentes, 1)
    assert.equal(result.creados, 3)

    const createManyArgs = created.data as {
      data: Array<{ ciudadanoId: string; servicioId: string; periodo: string }>
      skipDuplicates: boolean
    }

    assert.equal(createManyArgs.skipDuplicates, true)
    assert.deepEqual(
      createManyArgs.data.map((item) => `${item.ciudadanoId}:${item.servicioId}`),
      ['ciudadano-1:servicio-basura', 'ciudadano-2:servicio-agua', 'ciudadano-2:servicio-basura'],
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
