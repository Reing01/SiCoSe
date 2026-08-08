import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LandingPage from '../LandingPage'

describe('LandingPage', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows validation feedback when the contact form is submitted empty', () => {
    render(<LandingPage />)

    fireEvent.click(screen.getByRole('button', { name: /enviar datos/i }))

    expect(
      screen.getByText('Completa nombre, comité y contacto para continuar.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/nombre completo/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('posts contact data to the leads endpoint using the normalized payload', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<LandingPage />)

    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: '  Juan Pérez  ' },
    })
    fireEvent.change(screen.getByLabelText(/comité \/ junta auxiliar/i), {
      target: { value: '  Junta Auxiliar Centro  ' },
    })
    fireEvent.change(screen.getByLabelText(/teléfono o correo electrónico/i), {
      target: { value: '  222 123 4567  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar datos/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('/api/leads')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      JSON.stringify({
        nombre: 'Juan Pérez',
        comite: 'Junta Auxiliar Centro',
        contacto: '222 123 4567',
      }),
    )
    expect(await screen.findByText('¡Datos recibidos!')).toBeInTheDocument()
  })
})
