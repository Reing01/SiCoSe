import { apiRequest } from '../../lib/api'
import type { DashboardMetrics } from './dashboard.types'

type DashboardMetricsResponse = {
  data: Partial<DashboardMetrics> & {
    periodo: string
    totalRecaudadoMes: number
    porcentajeCobertura: number
    numeroMorosos: number
    comparativoMesAnterior: number
    totalAdeudosMes: number
    pagosRegistradosMes: number
    variacion: DashboardMetrics['variacion']
    ultimaActualizacion: string
    cache: DashboardMetrics['cache']
  }
}

type ReportExportFormat = 'pdf' | 'xlsx'

type MonthlyReportExportResponse = {
  data: {
    periodo: string
    formato: ReportExportFormat
    archivo_url: string
    archivo_path: string
  }
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeDashboardMetrics(
  metrics: DashboardMetricsResponse['data'],
): DashboardMetrics {
  const adeudosPagadosMes = isNumber(metrics.adeudosPagadosMes)
    ? metrics.adeudosPagadosMes
    : metrics.pagosRegistradosMes
  const historicoRecaudacion =
    Array.isArray(metrics.historicoRecaudacion) &&
    metrics.historicoRecaudacion.length > 0
      ? metrics.historicoRecaudacion.filter(
          (point) =>
            typeof point?.periodo === 'string' && isNumber(point.total),
        )
      : []

  return {
    ...metrics,
    totalPendienteMes: isNumber(metrics.totalPendienteMes)
      ? metrics.totalPendienteMes
      : null,
    adeudosPagadosMes,
    historicoRecaudacion:
      historicoRecaudacion.length > 0
        ? historicoRecaudacion
        : [
            {
              periodo: metrics.periodo,
              total: metrics.totalRecaudadoMes,
            },
          ],
  }
}

export async function fetchDashboardMetrics(token: string, periodo?: string) {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : ''
  const response = await apiRequest<DashboardMetricsResponse>(`/api/dashboard/metricas${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return normalizeDashboardMetrics(response.data)
}

export async function exportMonthlyReport(
  token: string,
  periodo: string,
  formato: ReportExportFormat,
) {
  const response = await apiRequest<MonthlyReportExportResponse>('/api/reportes/exportar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      periodo,
      formato,
    },
  })

  return response.data
}
