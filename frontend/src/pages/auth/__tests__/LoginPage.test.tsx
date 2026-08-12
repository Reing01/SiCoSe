import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOGIN_COPY } from '../../../features/auth/auth.copy'
import { authStorageKeys } from '../../../features/auth/auth.session'
import { ThemeProvider } from '../../../features/theme/theme'
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
    render(
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('heading', {
        name: /acceso directo al panel de cobranza de agua/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/sicose · sistema de cobro de agua/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/correo institucional/i)).toBeInTheDocument()
  })

  it('submits credentials and stores the auth session', async () => {
    loginMock.mockResolvedValueOnce({
      message: 'Login successful',
      data: {
        token: 'session-fixture-123',
        user: {
          email: 'admin@sicose.test',
          rol: 'admin',
        },
      },
    })

    render(
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>,
    )

    fireEvent.change(screen.getByLabelText(/correo institucional/i), {
      target: { value: 'ADMIN@SICOSE.TEST' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), {
      target: { value: 'SiCoSe2026!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'admin@sicose.test',
        password: 'SiCoSe2026!',
      })
    })

    expect(sessionStorage.getItem(authStorageKeys.token)).toBe('session-fixture-123')
    expect(JSON.parse(sessionStorage.getItem(authStorageKeys.user) ?? '{}')).toEqual({
      email: 'admin@sicose.test',
      rol: 'admin',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      LOGIN_COPY.success,
    )
  })
})
