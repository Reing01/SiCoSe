import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { authStorageKeys } from '../features/auth/auth.session'

afterEach(() => {
  window.history.replaceState({}, '', '/')
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('App routing', () => {
  it('redirects unauthenticated access at /ciudadanos to the login page', () => {
    window.history.pushState({}, '', '/ciudadanos')

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /acceso seguro al panel operativo de la junta auxiliar/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the login page at /login', () => {
    window.history.pushState({}, '', '/login')

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /acceso seguro al panel operativo de la junta auxiliar/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the dashboard page at /dashboard with KPI cards', async () => {
    window.history.pushState({}, '', '/dashboard')
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        id: 'user-1',
        email: 'admin@sicose.test',
        nombre: 'Cristian',
        rol: 'admin',
      }),
    )
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            periodo: '2026-06',
            totalRecaudadoMes: 1250,
            porcentajeCobertura: 80,
            numeroMorosos: 2,
            comparativoMesAnterior: 25,
            totalAdeudosMes: 10,
            pagosRegistradosMes: 7,
            variacion: {
              direccion: 'mejora',
              color: 'verde',
              montoMesAnterior: 1000,
            },
            ultimaActualizacion: '2026-06-18T12:00:00.000Z',
            cache: {
              hit: true,
              ttlSegundos: 300,
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/recaudado este mes/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /situacion financiera del mes/i }))
      .toBeInTheDocument()
    expect(screen.getByText('$1,250.00')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Redis activo')).toBeInTheDocument()
  })

  it('renders the citizen management page for a secretary session', () => {
    window.history.pushState({}, '', '/ciudadanos')
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        id: 'user-2',
        email: 'secretaria@sicose.test',
        nombre: 'Maria Nerida',
        rol: 'secretaria',
      }),
    )

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /gestion de ciudadanos con busqueda, edicion y validacion local/i,
      }),
    ).toBeInTheDocument()
  })
})
