import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStorageKeys } from '../../../features/auth/auth.session'
import LoginPage from '../LoginPage'

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}))

vi.mock('../../../features/auth/auth.api', () => ({
  login: loginMock,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    loginMock.mockReset()
  })

  it('renders the login hero and the login form', () => {
    render(<LoginPage />)

    expect(
      screen.getByRole('heading', {
        name: /acceso seguro al panel operativo de la junta auxiliar/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/act-7 · issue #007/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/correo institucional/i)).toBeInTheDocument()
  })

  it('submits credentials to the backend and stores the auth session', async () => {
    loginMock.mockResolvedValueOnce({
      message: 'Login successful',
      data: {
        token: 'jwt-token-123',
        user: {
          email: 'cristian@junta.gob.mx',
          rol: 'admin',
        },
      },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/correo institucional/i), {
      target: { value: 'CRISTIAN@JUNTA.GOB.MX' },
    })
    fireEvent.change(
      screen.getByLabelText(/contraseña/i, { selector: 'input' }),
      {
        target: { value: 'SiCoSe2026!' },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'cristian@junta.gob.mx',
        password: 'SiCoSe2026!',
      })
    })

    expect(sessionStorage.getItem(authStorageKeys.token)).toBe('jwt-token-123')
    expect(JSON.parse(sessionStorage.getItem(authStorageKeys.user) ?? '{}')).toEqual(
      {
        email: 'cristian@junta.gob.mx',
        rol: 'admin',
      },
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      /sesion iniciada correctamente/i,
    )
  })
})

