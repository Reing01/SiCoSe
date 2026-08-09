import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../../lib/api'
import { fetchPaymentReceiptBlob } from '../payment.api'

describe('payment.api receipt fallback', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tries the historical comprobante route when the receipt route is not found', async () => {
    const fetchMock = vi.mocked(globalThis.fetch)

    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: 'Route not found' }, { status: 404 }),
      )
      .mockResolvedValueOnce(
        new Response('PDF-OK', {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
          },
        }),
      )

    const blob = await fetchPaymentReceiptBlob('test-token', 'payment-1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${API_BASE_URL}/api/pagos/payment-1/recibo`,
    )
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${API_BASE_URL}/api/pagos/payment-1/comprobante`,
    )
    await expect(blob.text()).resolves.toBe('PDF-OK')
  })
})
