import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { authStorageKeys } from '../features/auth/auth.session'

function mockCitizenListRequest() {
  vi.spyOn(window, 'fetch').mockResolvedValue(
    Response.json({
      data: [],
      metadata: {
        total: 0,
        pagina: 1,
        limite: 100,
        totalPaginas: 0,
      },
    }),
  )
}

function mockUserListRequest() {
  vi.spyOn(window, 'fetch').mockResolvedValue(
    Response.json({
      data: [
        {
          id: 'user-1',
          email: 'admin@sicose.test',
          nombre: 'Cristian',
          rol: 'admin',
          activo: true,
          created_at: '2026-08-01T12:00:00.000Z',
          updated_at: '2026-08-01T12:00:00.000Z',
        },
      ],
      metadata: {
        total: 1,
        pagina: 1,
        limite: 100,
        totalPaginas: 1,
      },
    }),
  )
}

afterEach(() => {
  window.history.replaceState({}, '', '/')
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('App routing', () => {
  it('redirects unauthenticated access at /ciudadanos to the login page', async () => {
    window.history.pushState({}, '', '/ciudadanos')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /acceso seguro al panel principal de la junta auxiliar/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the login page at /login', async () => {
    window.history.pushState({}, '', '/login')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /acceso seguro al panel principal de la junta auxiliar/i,
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
            totalPendienteMes: 250,
            porcentajeCobertura: 80,
            numeroMorosos: 2,
            comparativoMesAnterior: 25,
            totalAdeudosMes: 10,
            adeudosPagadosMes: 8,
            pagosRegistradosMes: 7,
            historicoRecaudacion: [
              { periodo: '2026-01', total: 700 },
              { periodo: '2026-02', total: 800 },
              { periodo: '2026-03', total: 900 },
              { periodo: '2026-04', total: 1000 },
              { periodo: '2026-05', total: 1000 },
              { periodo: '2026-06', total: 1250 },
            ],
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

    expect(
      screen.getByRole('heading', { name: /situacion financiera del mes/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('$1,250.00')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Informacion disponible')).toBeInTheDocument()
  })

  it('renders the users page for an admin session at /usuarios', async () => {
    window.history.pushState({}, '', '/usuarios')
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
    mockUserListRequest()

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /usuarios con alta/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /nuevo usuario/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the reports page for a tesorero session at /reportes', async () => {
    window.history.pushState({}, '', '/reportes')
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        id: 'user-3',
        email: 'tesorero@sicose.test',
        nombre: 'Tesoreria',
        rol: 'tesorero',
      }),
    )

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /genera, exporta e imprime reportes operativos/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /generar reporte/i,
      }),
    ).toBeInTheDocument()
  })

  it('shows a public alert when dashboard export fails', async () => {
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
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)

      if (url.includes('dashboard/metricas')) {
        return new Response(
          JSON.stringify({
            data: {
              periodo: '2026-06',
              totalRecaudadoMes: 1250,
              totalPendienteMes: 250,
              porcentajeCobertura: 80,
              numeroMorosos: 2,
              comparativoMesAnterior: 25,
              totalAdeudosMes: 10,
              adeudosPagadosMes: 8,
              pagosRegistradosMes: 7,
              historicoRecaudacion: [
                { periodo: '2026-01', total: 700 },
                { periodo: '2026-02', total: 800 },
                { periodo: '2026-03', total: 900 },
                { periodo: '2026-04', total: 1000 },
                { periodo: '2026-05', total: 1000 },
                { periodo: '2026-06', total: 1250 },
              ],
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
        )
      }

      return new Response(
        JSON.stringify({
          error: 'private export diagnostic',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    })

    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /exportar excel/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no fue posible generar la exportacion/i,
    )
    expect(screen.queryByText(/private export diagnostic/i)).not.toBeInTheDocument()
  })

  it('uses the local storage proxy before private Supabase report URLs', async () => {
    window.history.pushState({}, '', '/dashboard')
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        id: 'user-3',
        email: 'tesorero@sicose.test',
        nombre: 'Tesoreria',
        rol: 'tesorero',
      }),
    )

    const privateReportUrl =
      'https://wruzbnpaiyvmaldkdcmf.supabase.co/storage/v1/object/comprobantes/reportes/2026-07/reporte-mensual.xlsx'
    const fetchCalls: string[] = []

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reporte')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      fetchCalls.push(url)

      if (url.includes('dashboard/metricas')) {
        return Response.json({
          data: {
            periodo: '2026-07',
            totalRecaudadoMes: 1250,
            totalPendienteMes: 250,
            porcentajeCobertura: 80,
            numeroMorosos: 2,
            comparativoMesAnterior: 25,
            totalAdeudosMes: 10,
            adeudosPagadosMes: 8,
            pagosRegistradosMes: 7,
            historicoRecaudacion: [
              { periodo: '2026-02', total: 700 },
              { periodo: '2026-03', total: 800 },
              { periodo: '2026-04', total: 900 },
              { periodo: '2026-05', total: 1000 },
              { periodo: '2026-06', total: 1000 },
              { periodo: '2026-07', total: 1250 },
            ],
            variacion: {
              direccion: 'mejora',
              color: 'verde',
              montoMesAnterior: 1000,
            },
            ultimaActualizacion: '2026-07-19T12:00:00.000Z',
            cache: {
              hit: true,
              ttlSegundos: 300,
            },
          },
        })
      }

      if (url.includes('reportes/exportar')) {
        return Response.json(
          {
            data: {
              periodo: '2026-07',
              formato: 'xlsx',
              archivo_url: privateReportUrl,
              archivo_path: 'reportes/2026-07/reporte-mensual.xlsx',
            },
          },
          { status: 201 },
        )
      }

      if (url.startsWith('/api/storage-download?url=')) {
        return new Response('xlsx-fixture', {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        })
      }

      return new Response(null, { status: 400 })
    })

    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /exportar excel/i }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      /exportaci[oó]n excel lista/i,
    )

    const directPrivateCalls = fetchCalls.filter((url) =>
      url.startsWith(privateReportUrl),
    )
    expect(directPrivateCalls).toHaveLength(0)
    expect(fetchCalls).toContain(
      `/api/storage-download?url=${encodeURIComponent(privateReportUrl)}`,
    )
  })

  it('renders the citizen management page for a secretary session', async () => {
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
    mockCitizenListRequest()

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /gesti[oó]n de ciudadanos con b[uú]squeda, edici[oó]n y control de datos/i,
      }),
    ).toBeInTheDocument()
  })

  it('redirects secretary away from /dashboard to /ciudadanos', async () => {
    window.history.pushState({}, '', '/dashboard')
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
    mockCitizenListRequest()

    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/ciudadanos')
    })
  })

  it('redirects secretary away from /reportes to /ciudadanos', async () => {
    window.history.pushState({}, '', '/reportes')
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
    mockCitizenListRequest()

    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/ciudadanos')
    })
  })

  it('redirects tesorero away from /ciudadanos to /dashboard', async () => {
    window.history.pushState({}, '', '/ciudadanos')
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        id: 'user-3',
        email: 'tesorero@sicose.test',
        nombre: 'Tesoreria',
        rol: 'tesorero',
      }),
    )
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            periodo: '2026-06',
            totalRecaudadoMes: 1250,
            totalPendienteMes: 250,
            porcentajeCobertura: 80,
            numeroMorosos: 2,
            comparativoMesAnterior: 25,
            totalAdeudosMes: 10,
            adeudosPagadosMes: 8,
            pagosRegistradosMes: 7,
            historicoRecaudacion: [
              { periodo: '2026-01', total: 700 },
              { periodo: '2026-02', total: 800 },
              { periodo: '2026-03', total: 900 },
              { periodo: '2026-04', total: 1000 },
              { periodo: '2026-05', total: 1000 },
              { periodo: '2026-06', total: 1250 },
            ],
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
      expect(window.location.pathname).toBe('/dashboard')
    })
  })
})
