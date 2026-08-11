import { apiRequest } from '../../lib/api'
import type { DashboardMetrics } from './dashboard.types'

const dashboardMetricsCache = new Map<string, DashboardMetrics>()
const dashboardMetricsRequests = new Map<string, Promise<DashboardMetrics>>()

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

function getDashboardMetricsCacheKey(token: string, periodo?: string) {
  return `${token}::${periodo ?? ''}`
}

async function requestDashboardMetrics(token: string, periodo?: string) {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : ''
  const response = await apiRequest<DashboardMetricsResponse>(`/api/dashboard/metricas${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return normalizeDashboardMetrics(response.data)
}

export function prefetchDashboardMetrics(token: string, periodo?: string) {
  void fetchDashboardMetrics(token, periodo)
}

export function consumePrefetchedDashboardMetrics(
  token: string,
  periodo?: string,
) {
  const cacheKey = getDashboardMetricsCacheKey(token, periodo)
  const cachedMetrics = dashboardMetricsCache.get(cacheKey)

  if (!cachedMetrics) {
    return null
  }

  dashboardMetricsCache.delete(cacheKey)
  return cachedMetrics
}

export async function fetchDashboardMetrics(token: string, periodo?: string) {
  const cacheKey = getDashboardMetricsCacheKey(token, periodo)
  const cachedMetrics = dashboardMetricsCache.get(cacheKey)

  if (cachedMetrics) {
    return cachedMetrics
  }

  const pendingRequest = dashboardMetricsRequests.get(cacheKey)

  if (pendingRequest) {
    return pendingRequest
  }

  const request = requestDashboardMetrics(token, periodo)
    .then((metrics) => {
      dashboardMetricsCache.set(cacheKey, metrics)
      return metrics
    })
    .finally(() => {
      dashboardMetricsRequests.delete(cacheKey)
    })

  dashboardMetricsRequests.set(cacheKey, request)

  return request
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
