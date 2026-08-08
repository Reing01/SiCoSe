import { apiRequest } from '../../lib/api'

export type CitizenHistoryServiceRecord = {
  id: string
  nombre: string
  tarifa: number
}

export type CitizenHistoryDebtRecord = {
  id: string
  ciudadanoId: string
  servicioId: string
  monto: number
  periodo: string
  vencimiento: string
  pagado: boolean
  estado: string
  servicio: CitizenHistoryServiceRecord
}

export type CitizenHistoryPaymentRecord = {
  id: string
  ciudadanoId: string
  adeudoId: string
  monto: number
  fecha: string
  metodo: string
  folio: string | null
  recibo: string | null
  creado_por: string | null
  adeudo: {
    id: string
    periodo: string
    monto: number
    servicio: CitizenHistoryServiceRecord
  }
  comprobantes: Array<{
    id: string
    url: string
    nombre_archivo: string | null
    mime_type: string | null
    fecha: string
  }>
}

export type CitizenHistoryResponse = {
  data: {
    ciudadanoId: string
    adeudos: CitizenHistoryDebtRecord[]
    pagos: CitizenHistoryPaymentRecord[]
    historial: Array<{
      tipo: 'adeudo' | 'pago'
      fecha: string
      data: unknown
    }>
  }
  metadata: {
    totalAdeudos: number
    totalPagos: number
    totalMovimientos: number
    filtros: {
      anio?: number
      servicio_id?: string
      estado?: string
    }
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchCitizenHistory(token: string, citizenId: string) {
  const response = await apiRequest<CitizenHistoryResponse>(
    `/api/ciudadanos/${encodeURIComponent(citizenId)}/historial`,
    {
      headers: authHeaders(token),
    },
  )

  return response.data
}
