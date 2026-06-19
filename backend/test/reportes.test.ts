import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { generateMonthlyReport as generateMonthlyReportType } from '../src/services/reportes.js'

let generateMonthlyReport: typeof generateMonthlyReportType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.DIRECT_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ generateMonthlyReport } = await import('../src/services/reportes.js'))
})

function createReportClient() {
  const calls = {
    reporteCreate: undefined as unknown,
    upload: undefined as unknown,
  }

  const currentPayments = [
    {
      monto: 45.5,
      fecha: new Date('2026-06-05T10:00:00.000Z'),
      adeudo: {
        servicio: {
          id: 'servicio-agua',
          nombre: 'Agua potable',
        },
      },
    },
    {
      monto: 32,
      fecha: new Date('2026-06-09T10:00:00.000Z'),
      adeudo: {
        servicio: {
          id: 'servicio-agua',
          nombre: 'Agua potable',
        },
      },
    },
    {
      monto: 25,
      fecha: new Date('2026-06-12T10:00:00.000Z'),
      adeudo: {
        servicio: {
          id: 'servicio-basura',
          nombre: 'Recoleccion de basura',
        },
      },
    },
  ]

  const previousPayments = [
    {
      monto: 20,
      fecha: new Date('2026-05-15T10:00:00.000Z'),
      adeudo: {
        servicio: {
          id: 'servicio-agua',
          nombre: 'Agua potable',
        },
      },
    },
  ]

  const overdueDebts = [
    {
      id: 'adeudo-1',
      ciudadano: {
        nombre: 'Jose',
        apellido: 'Ramirez',
        clave_catastral: 'CAT-0002',
        zona: 'Norte',
      },
      servicio: {
        nombre: 'Agua potable',
      },
      periodo: '2026-06',
      monto: 95,
      vencimiento: new Date('2026-06-30T00:00:00.000Z'),
    },
    {
      id: 'adeudo-2',
      ciudadano: {
        nombre: 'Maria',
        apellido: 'Gonzalez',
        clave_catastral: 'CAT-0001',
        zona: 'Centro',
      },
      servicio: {
        nombre: 'Alcantarillado',
      },
      periodo: '2026-05',
      monto: 80,
      vencimiento: new Date('2026-05-31T00:00:00.000Z'),
    },
  ]

    const tx = {
    pago: {
      findMany: async (args: { where: { fecha: { gte: Date; lte: Date } } }) => {
        const startMonth = args.where.fecha.gte.getUTCMonth()
        return startMonth === 5 ? currentPayments : previousPayments
      },
    },
    adeudo: {
      count: async () => overdueDebts.length,
      aggregate: async () => ({
        _sum: {
          monto: overdueDebts.reduce((sum, debt) => sum + debt.monto, 0),
        },
      }),
      findMany: async () => overdueDebts,
    },
    reporte: {
      create: async (args: { data: { archivo_url: string } }) => {
        calls.reporteCreate = args
        return {
          id: 'reporte-1',
          ciudadanoId: null,
          titulo: 'Reporte mensual junio 2026',
          descripcion: 'PDF institucional con recaudacion por servicio, top de morosos y comparativo frente al mes anterior.',
          tipo: 'MENSUAL',
          estado: 'GENERADO',
          periodo: '2026-06',
          archivo_url: args.data.archivo_url,
          archivo_path: 'reportes/2026-06/123-reporte.pdf',
          generado_por: 'user-1',
          resumen_json: null,
          fecha: new Date('2026-06-18T10:00:00.000Z'),
          created_at: new Date('2026-06-18T10:00:00.000Z'),
          updated_at: new Date('2026-06-18T10:00:00.000Z'),
        }
      },
    },
  }

  const client = {
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx),
  }

  const storageUploader = async (args: { path: string; buffer: Buffer; contentType: string }) => {
    calls.upload = args
    return {
      bucket: 'comprobantes',
      path: args.path,
      url: `https://storage.example/${args.path}`,
    }
  }

  return { client, storageUploader, calls }
}

describe('generateMonthlyReport', () => {
  it('builds the monthly PDF, stores it and saves the report metadata', async () => {
    const { client, storageUploader, calls } = createReportClient()

    const result = await generateMonthlyReport(
      {
        periodo: '2026-06',
        usuarioId: 'user-1',
      },
      client as never,
      storageUploader,
    )

    assert.equal(result.periodo, '2026-06')
    assert.equal(result.previousPeriodo, '2026-05')
    assert.equal(result.serviceRevenue.length, 2)
    assert.equal(result.topMorosos.length, 2)
    assert.equal(result.carteraVencida, 175)
    assert.equal(result.report.periodo, '2026-06')
    assert.match(result.report.archivo_url, /^https:\/\/storage\.example\/reportes\/2026-06\/\d+-reporte-mensual-2026-06\.pdf$/)

    const uploadArgs = calls.upload as { path: string; buffer: Buffer; contentType: string }
    assert.match(uploadArgs.path, /^reportes\/2026-06\/\d+-reporte-mensual-2026-06\.pdf$/)
    assert.equal(uploadArgs.contentType, 'application/pdf')
    assert.equal(uploadArgs.buffer.length > 0, true)

    const createArgs = calls.reporteCreate as {
      data: {
        periodo: string
        resumen_json: { recaudacionPorServicio: Array<{ servicio: string }> }
      }
    }
    assert.equal(createArgs.data.periodo, '2026-06')
    assert.equal(createArgs.data.resumen_json.recaudacionPorServicio[0].servicio, 'Agua potable')
  })

  it('rejects an invalid period format', async () => {
    const { client, storageUploader } = createReportClient()

    await assert.rejects(
      generateMonthlyReport(
        {
          periodo: '06-2026',
          usuarioId: 'user-1',
        },
        client as never,
        storageUploader,
      ),
      {
        name: 'Error',
        message: 'Invalid period format. Expected YYYY-MM',
      },
    )
  })
})
