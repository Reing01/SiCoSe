import { apiRequest } from '../../lib/api'
import type { DashboardMetrics } from './dashboard.types'

type DashboardMetricsResponse = {
  data: DashboardMetrics
}

export async function fetchDashboardMetrics(token: string) {
  const response = await apiRequest<DashboardMetricsResponse>('/api/dashboard/metricas', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}
