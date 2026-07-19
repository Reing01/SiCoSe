import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../../lib/api'
import { exportMonthlyReport, fetchDashboardMetrics } from '../dashboard.api'

describe('dashboard.api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('serializes report export payload as JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Monthly report export generated',
          data: {
            periodo: '2026-06',
            formato: 'xlsx',
            archivo_url: 'https://example.test/reportes/reporte.xlsx',
            archivo_path: 'reportes/2026-06/reporte.xlsx',
          },
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const response = await exportMonthlyReport('token-demo', '2026-06', 'xlsx')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)

    expect(url).toBe(`${API_BASE_URL}/api/reportes/exportar`)
    expect(init.method).toBe('POST')
    expect(headers.get('Authorization')).toBe('Bearer token-demo')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(
      JSON.stringify({
        periodo: '2026-06',
        formato: 'xlsx',
      }),
    )
    expect(response.formato).toBe('xlsx')
  })

  it('normalizes legacy dashboard metrics without optional production fields', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            periodo: '2026-07',
            totalRecaudadoMes: 0,
            porcentajeCobertura: 0,
            numeroMorosos: 7,
            comparativoMesAnterior: -100,
            totalAdeudosMes: 21,
            pagosRegistradosMes: 0,
            variacion: {
              direccion: 'empeora',
              color: 'rojo',
              montoMesAnterior: 1250,
            },
            ultimaActualizacion: '2026-07-19T09:30:00.000Z',
            cache: {
              hit: false,
              ttlSegundos: 300,
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const metrics = await fetchDashboardMetrics('token-demo', '2026-07')

    expect(metrics.totalPendienteMes).toBeNull()
    expect(metrics.adeudosPagadosMes).toBe(0)
    expect(metrics.historicoRecaudacion).toEqual([
      {
        periodo: '2026-07',
        total: 0,
      },
    ])
  })
})
