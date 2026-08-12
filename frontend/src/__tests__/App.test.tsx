import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { authStorageKeys } from '../features/auth/auth.session'
import * as citizenApi from '../features/citizens/citizen.api'
import * as citizenHistoryApi from '../features/citizens/citizen-history.api'
import * as dashboardApi from '../features/dashboard/dashboard.api'

vi.mock('../features/citizens/citizen.api')
vi.mock('../features/citizens/citizen-history.api')
vi.mock('../features/dashboard/dashboard.api')

function persistSession(role: 'admin' | 'tesorero' | 'secretaria') {
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

function mockDashboardFlow() {
  vi.mocked(dashboardApi.fetchDashboardMetrics).mockResolvedValue({
    periodo: '2026-08',
    totalRecaudadoMes: 1850,
    totalPendienteMes: 620,
    porcentajeCobertura: 74.8,
    numeroMorosos: 4,
    comparativoMesAnterior: 12.5,
    totalAdeudosMes: 18,
    adeudosPagadosMes: 14,
    pagosRegistradosMes: 14,
    historicoRecaudacion: [
      { periodo: '2026-03', total: 980 },
      { periodo: '2026-04', total: 1050 },
      { periodo: '2026-05', total: 1110 },
      { periodo: '2026-06', total: 1180 },
      { periodo: '2026-07', total: 1450 },
      { periodo: '2026-08', total: 1850 },
    ],
    variacion: {
      direccion: 'mejora',
      color: 'verde',
      montoMesAnterior: 1645,
    },
    ultimaActualizacion: '2026-08-11T09:30:00.000Z',
    cache: {
      hit: false,
      ttlSegundos: 300,
    },
  })

  vi.mocked(dashboardApi.exportMonthlyReport).mockResolvedValue({
    periodo: '2026-08',
    formato: 'pdf',
    archivo_url: 'https://example.test/reportes/reporte.pdf',
    archivo_path: 'reportes/2026-08/reporte.pdf',
  })
}

function mockCitizenFlow() {
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

  vi.mocked(citizenHistoryApi.fetchCitizenHistory).mockResolvedValue({
    ciudadanoId: 'citizen-1',
    adeudos: [
      {
        id: 'debt-1',
        ciudadanoId: 'citizen-1',
        servicioId: 'service-water',
        monto: 30,
        periodo: '2026-08',
        vencimiento: '2026-08-31T00:00:00.000Z',
        pagado: false,
        estado: 'pendiente',
        servicio: {
          id: 'service-water',
          nombre: 'Agua potable',
          tarifa: 30,
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
    mockDashboardFlow()
    mockCitizenFlow()
  })

  it('redirige a dashboard cuando una sesion admin entra en /login', async () => {
    window.history.pushState({}, '', '/login')
    persistSession('admin')

    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('redirige a ciudadanos cuando una sesion secretaria entra en /login', async () => {
    window.history.pushState({}, '', '/login')
    persistSession('secretaria')

    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/ciudadanos')
    })
  })

  it('mantiene la landing page en / cuando no hay sesion', async () => {
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /dile adiós a las/i,
      }),
    ).toBeInTheDocument()
  })

  it('protege las rutas privadas y manda al login si no hay sesion', async () => {
    window.history.pushState({}, '', '/dashboard')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /inicia sesi[oó]n/i,
      }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
  })
})
