import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { listAuditorias as listAuditoriasType } from '../src/services/auditorias.js'

let listAuditorias: typeof listAuditoriasType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ listAuditorias } = await import('../src/services/auditorias.js'))
})

function createAuditoriaClient() {
  const calls = {
    count: undefined as unknown,
    findMany: undefined as unknown,
  }

  return {
    calls,
    auditoria: {
      count: async (args: unknown) => {
        calls.count = args
        return 11
      },
      findMany: async (args: unknown) => {
        calls.findMany = args
        return [
          {
            id: 'audit-1',
            accion: 'REGISTRO_PAGO_EFECTIVO',
            entidad: 'Pago',
            entidad_id: 'payment-1',
            detalles: '{"folio":"SCS-2026-000001"}',
            ip: '127.0.0.1',
            timestamp: new Date('2026-06-18T12:00:00.000Z'),
            usuario: {
              id: 'user-1',
              email: 'admin@sicose.test',
              nombre: 'Admin',
              rol: 'admin',
            },
          },
        ]
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  }
}

describe('listAuditorias', () => {
  it('applies filters, pagination and descending order', async () => {
    const client = createAuditoriaClient()

    const result = await listAuditorias(
      {
        pagina: 2,
        limite: 5,
        usuarioId: 'user-1',
        accion: 'pago',
        entidad: 'Pago',
        desde: '2026-06-01',
        hasta: '2026-06-30',
      },
      client as never,
    )

    assert.equal(result.metadata.total, 11)
    assert.equal(result.metadata.pagina, 2)
    assert.equal(result.metadata.limite, 5)
    assert.equal(result.metadata.totalPaginas, 3)
    assert.equal(result.data.at(0)?.id, 'audit-1')

    const countArgs = client.calls.count as { where: Record<string, unknown> }
    const findManyArgs = client.calls.findMany as {
      where: Record<string, unknown>
      skip: number
      take: number
      orderBy: Record<string, unknown>
      include: Record<string, unknown>
    }

    assert.equal(countArgs.where.usuarioId, 'user-1')
    assert.deepEqual(countArgs.where.accion, {
      contains: 'pago',
      mode: 'insensitive',
    })
    assert.deepEqual(countArgs.where.entidad, {
      contains: 'Pago',
      mode: 'insensitive',
    })

    const timestamp = countArgs.where.timestamp as { gte: Date; lte: Date }
    assert.equal(timestamp.gte.toISOString(), '2026-06-01T00:00:00.000Z')
    assert.equal(timestamp.lte.toISOString(), '2026-06-30T23:59:59.999Z')

    assert.equal(findManyArgs.skip, 5)
    assert.equal(findManyArgs.take, 5)
    assert.deepEqual(findManyArgs.orderBy, {
      timestamp: 'desc',
    })
  })
})
