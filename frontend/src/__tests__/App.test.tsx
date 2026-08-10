import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { authStorageKeys } from '../features/auth/auth.session'
import * as citizenApi from '../features/citizens/citizen.api'
import * as citizenHistoryApi from '../features/citizens/citizen-history.api'
import * as paymentApi from '../features/payments/payment.api'

vi.mock('../features/citizens/citizen.api')
vi.mock('../features/citizens/citizen-history.api')
vi.mock('../features/payments/payment.api')

function persistSession(role: 'admin' | 'tesorero' = 'tesorero') {
  window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
  window.sessionStorage.setItem(
    authStorageKeys.user,
    JSON.stringify({
      id: 'user-1',
      email: `${role}@sicose.test`,
      nombre: role,
      rol: role,
    }),
  )
}

function mockPaymentsFlow() {
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
        periodo: '2026-08',
        vencimiento: '2026-08-31T00:00:00.000Z',
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
        periodo: '2026-08',
        vencimiento: '2026-08-31T00:00:00.000Z',
        pagado: false,
        estado: 'pendiente',
        servicio: {
          id: 'service-water',
          nombre: 'Agua potable',
          tarifa: 100,
        },
      },
    ],
    pagos: [],
    historial: [],
  })
}

afterEach(() => {
  window.history.replaceState({}, '', '/')
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('App routing', () => {
  beforeEach(() => {
    mockPaymentsFlow()
  })

  it('redirects authenticated sessions at /login to pagos', async () => {
    window.history.pushState({}, '', '/login')
    persistSession('admin')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /cobro de agua, historial y comprobantes/i,
      }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/pagos')
    })
  })

  it('redirects authenticated sessions at / to pagos', async () => {
    window.history.pushState({}, '', '/')
    persistSession('tesorero')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /cobro de agua, historial y comprobantes/i,
      }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/pagos')
    })
  })

  it('renders the login page when there is no session', async () => {
    window.history.pushState({}, '', '/login')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /inicia sesi[oó]n/i,
      }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated access to /pagos back to login', async () => {
    window.history.pushState({}, '', '/pagos')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /inicia sesi[oó]n/i,
      }),
    ).toBeInTheDocument()
  })
})
