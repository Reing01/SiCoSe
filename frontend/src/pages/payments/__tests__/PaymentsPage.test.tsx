import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../../features/theme/theme'
import { authStorageKeys } from '../../../features/auth/auth.session'
import PaymentsPage from '../PaymentsPage'
import * as paymentApi from '../../../features/payments/payment.api'
import * as citizenApi from '../../../features/citizens/citizen.api'
import * as citizenHistoryApi from '../../../features/citizens/citizen-history.api'

vi.mock('../../../features/payments/payment.api')
vi.mock('../../../features/citizens/citizen.api')
vi.mock('../../../features/citizens/citizen-history.api')

function persistTesoreroSession() {
  window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
  window.sessionStorage.setItem(
    authStorageKeys.user,
    JSON.stringify({
      email: 'tesorero@sicose.test',
      rol: 'tesorero',
    }),
  )
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    persistTesoreroSession()
    vi.mocked(citizenApi.fetchCitizenPage).mockResolvedValue({
      records: [
        {
          id: 'citizen-1',
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@test.com',
          telefono: '',
          direccion: '',
          claveCatastral: 'CATA-123',
          activo: true,
          createdAt: '2026-08-01T12:00:00.000Z',
          updatedAt: '2026-08-01T12:00:00.000Z',
        },
      ],
      metadata: {
        total: 1,
        pagina: 1,
        limite: 6,
        totalPaginas: 1,
      },
    })
    vi.mocked(paymentApi.fetchPendingDebts).mockResolvedValue({
      data: [
        {
          id: 'debt-1',
          ciudadanoId: 'citizen-1',
          servicioId: 'service-water',
          monto: 100,
          periodo: '2026-06',
          vencimiento: '2026-06-30T00:00:00.000Z',
          estado: 'pendiente',
          ciudadano: {
            nombre: 'Juan',
            apellido: 'Perez',
            email: 'juan@test.com',
            clave_catastral: 'CATA-123',
          },
          servicio: {
            nombre: 'Agua potable',
            tarifa: 100,
          },
        },
      ],
      metadata: {
        total: 1,
        totalPendiente: 100,
      },
    })
    vi.mocked(citizenHistoryApi.fetchCitizenHistory).mockResolvedValue({
      ciudadanoId: 'citizen-1',
      adeudos: [
        {
          id: 'debt-1',
          ciudadanoId: 'citizen-1',
          servicioId: 'service-water',
          monto: 100,
          periodo: '2026-06',
          vencimiento: '2026-06-30T00:00:00.000Z',
          pagado: false,
          estado: 'pendiente',
          servicio: {
            id: 'service-water',
            nombre: 'Agua potable',
            tarifa: 100,
          },
        },
      ],
      pagos: [
        {
          id: 'payment-1',
          ciudadanoId: 'citizen-1',
          adeudoId: 'debt-1',
          monto: 40,
          fecha: '2026-06-15T12:00:00.000Z',
          metodo: 'efectivo',
          folio: 'SCS-2026-000001',
          recibo: 'SCS-2026-000001',
          creado_por: 'user-1',
          adeudo: {
            id: 'debt-1',
            periodo: '2026-06',
            monto: 100,
            servicio: {
              id: 'service-water',
              nombre: 'Agua potable',
              tarifa: 100,
            },
          },
          comprobantes: [],
        },
      ],
      historial: [],
    })
    vi.mocked(paymentApi.registerPayment).mockResolvedValue({
      id: 'payment-2',
      folio: 'SCS-2026-000002',
      monto: 40,
      metodo: 'efectivo',
      fecha: '2026-08-08T12:00:00.000Z',
    })
    vi.mocked(paymentApi.fetchPaymentReceiptBlob).mockResolvedValue(
      new Blob(['pdf-fixture'], { type: 'application/pdf' }),
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:receipt')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('renders payment history, supports payments and opens receipts', async () => {
    render(
      <ThemeProvider>
        <PaymentsPage />
      </ThemeProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: /cobro de agua, historial y comprobantes/i }),
    ).toBeInTheDocument()

    await screen.findByRole('heading', { name: /buscar ciudadano para cobrar/i })
    await screen.findByRole('heading', { name: /historial de pagos/i })
    expect(screen.getAllByText(/cuota base/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/juan perez/i).length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(citizenApi.fetchCitizenPage).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          pagina: 1,
          limite: 6,
          nombre: undefined,
          incluirInactivos: false,
        }),
      )
    })
    await waitFor(() => {
      expect(citizenHistoryApi.fetchCitizenHistory).toHaveBeenCalledWith(
        'test-token',
        'citizen-1',
      )
    })

    fireEvent.click(screen.getAllByRole('button', { name: /imprimir/i })[0])

    await waitFor(() => {
      expect(paymentApi.fetchPaymentReceiptBlob).toHaveBeenCalledWith('test-token', 'payment-1')
    })

    fireEvent.change(screen.getByLabelText(/monto/i), {
      target: { value: '100' },
    })

    const form = screen.getByRole('button', { name: /confirmar pago/i }).closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(paymentApi.registerPayment).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          ciudadanoId: 'citizen-1',
          adeudoId: 'debt-1',
          monto: 100,
        }),
      )
    })
  })
})
