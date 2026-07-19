import { apiRequest } from '../../lib/api'
import type { DashboardMetrics } from './dashboard.types'

type DashboardMetricsResponse = {
  data: DashboardMetrics
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

export async function fetchDashboardMetrics(token: string, periodo?: string) {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : ''
  const response = await apiRequest<DashboardMetricsResponse>(`/api/dashboard/metricas${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
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
