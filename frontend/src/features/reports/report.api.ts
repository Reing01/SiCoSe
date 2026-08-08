import { apiRequest } from '../../lib/api'

export type ReportExportFormat = 'pdf' | 'xlsx'

export type MonthlyReportServiceRevenueRow = {
  servicioId: string
  servicio: string
  pagos: number
  recaudado: number
  promedio: number
}

export type MonthlyReportTopDebtorRow = {
  id: string
  ciudadano: {
    nombre: string
    apellido: string
    clave_catastral: string
    zona: string | null
  }
  servicio: {
    nombre: string
  }
  periodo: string
  monto: number
  vencimiento: string
}

export type MonthlyReportSummary = {
  periodo: string
  periodoAnterior: string
  formato: ReportExportFormat
  recaudadoActual: number
  recaudadoAnterior: number
  carteraVencida: number
  morosos: number
  recaudacionPorServicio: MonthlyReportServiceRevenueRow[]
  topMorosos: MonthlyReportTopDebtorRow[]
}

export type MonthlyReportRecord = {
  id: string
  periodo: string
  titulo: string
  tipo: string
  estado: string
  archivo_url: string
  archivo_path: string
  resumen_json: MonthlyReportSummary | null
  fecha: string
  formato?: ReportExportFormat
}

type ReportResponse = {
  data: MonthlyReportRecord
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function generateMonthlyReport(
  token: string,
  periodo: string,
) {
  const response = await apiRequest<ReportResponse>('/api/reportes/generar', {
    method: 'POST',
    headers: authHeaders(token),
    body: {
      periodo,
    },
  })

  return response.data
}

export async function exportMonthlyReport(
  token: string,
  periodo: string,
  formato: ReportExportFormat,
) {
  const response = await apiRequest<ReportResponse>('/api/reportes/exportar', {
    method: 'POST',
    headers: authHeaders(token),
    body: {
      periodo,
      formato,
    },
  })

  return response.data
}
