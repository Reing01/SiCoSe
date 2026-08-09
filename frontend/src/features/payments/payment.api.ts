import { API_BASE_URL, apiRequest } from '../../lib/api'

export type PendingDebtRecord = {
  id: string
  ciudadanoId: string
  servicioId: string
  monto: number
  periodo: string
  vencimiento: string
  estado: string
  ciudadano: {
    nombre: string
    apellido: string
    email: string
    clave_catastral: string
  }
  servicio: {
    nombre: string
    tarifa: number
  }
}

export type PaymentRecord = {
  id: string
  folio: string | null
  monto: number
  metodo: string
  fecha: string
}

type PendingDebtResponse = {
  data: PendingDebtRecord[]
  metadata: {
    total: number
    totalPendiente: number
  }
}

type PaymentResponse = {
  data: PaymentRecord
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchPendingDebts(token: string) {
  return apiRequest<PendingDebtResponse>('/api/adeudos/pendientes?limite=100', {
    headers: authHeaders(token),
  })
}

export async function registerPayment(
  token: string,
  input: {
    metodo: 'efectivo' | 'transferencia'
    ciudadanoId: string
    adeudoId: string
    monto: number
    referenciaBancaria?: string
    comprobante?: File
  },
) {
  if (input.metodo === 'transferencia') {
    const formData = new FormData()
    formData.set('metodo', input.metodo)
    formData.set('ciudadano_id', input.ciudadanoId)
    formData.set('adeudo_id', input.adeudoId)
    formData.set('monto', String(input.monto))
    formData.set('referencia_bancaria', input.referenciaBancaria ?? '')

    if (input.comprobante) {
      formData.set('comprobante', input.comprobante)
    }

    const response = await apiRequest<PaymentResponse>('/api/pagos', {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    })

    return response.data
  }

  const response = await apiRequest<PaymentResponse>('/api/pagos', {
    method: 'POST',
    headers: authHeaders(token),
    body: {
      metodo: input.metodo,
      ciudadano_id: input.ciudadanoId,
      adeudo_id: input.adeudoId,
      monto: input.monto,
    },
  })

  return response.data
}

export async function fetchPaymentReceiptBlob(token: string, paymentId: string) {
  const receiptPaths = [
    `/api/pagos/${encodeURIComponent(paymentId)}/recibo`,
    `/api/pagos/${encodeURIComponent(paymentId)}/comprobante`,
  ]

  let lastResponse: Response | null = null

  for (const path of receiptPaths) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      credentials: 'include',
    })

    lastResponse = response

    if (response.ok) {
      return response.blob()
    }

    if (response.status !== 404) {
      break
    }
  }

  if (lastResponse && !lastResponse.ok) {
    if (lastResponse.status === 404) {
      throw new Error('No fue posible generar el comprobante de pago.')
    }

    const payload = await lastResponse
      .clone()
      .json()
      .catch(() => null)

    throw new Error(
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'No fue posible generar el comprobante de pago.',
    )
  }

  throw new Error('No fue posible generar el comprobante de pago.')
}
