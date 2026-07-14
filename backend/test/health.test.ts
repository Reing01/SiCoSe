import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { getLivenessReport as getLivenessReportType, getReadinessReport as getReadinessReportType } from '../src/services/health.js'

let getReadinessReport: typeof getReadinessReportType
let getLivenessReport: typeof getLivenessReportType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ getReadinessReport, getLivenessReport } = await import('../src/services/health.js'))
})

describe('health reports', () => {
  it('reports ready when all probes succeed', async () => {
    const report = await getReadinessReport({
      databaseProbe: async () => undefined,
      redisProbe: async () => undefined,
    })

    assert.equal(report.ok, true)
    assert.equal(report.status, 'ready')
    assert.equal(report.checks.database.ok, true)
    assert.equal(report.checks.redis.ok, true)
    assert.equal(typeof report.timestamp, 'string')
  })

  it('reports degraded when one probe fails', async () => {
    const report = await getReadinessReport({
      databaseProbe: async () => undefined,
      redisProbe: async () => {
        throw new Error('redis down')
      },
    })

    assert.equal(report.ok, false)
    assert.equal(report.status, 'degraded')
    assert.equal(report.checks.database.ok, true)
    assert.equal(report.checks.redis.ok, false)
    assert.equal(report.checks.redis.error, 'redis down')
  })

  it('reports liveness without dependency checks', () => {
    const report = getLivenessReport()

    assert.equal(report.ok, true)
    assert.equal(report.status, 'alive')
    assert.deepEqual(report.layers, ['api-gateway'])
  })
})
