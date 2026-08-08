import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import RoutePills from '../RoutePills'
import { authStorageKeys } from '../../features/auth/auth.session'

describe('RoutePills', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('reveals the mobile route list when the menu button is opened', () => {
    render(<RoutePills />)

    const navigation = screen.getByRole('navigation', {
      name: 'Navegacion de pantallas',
    })

    expect(navigation).toHaveClass('hidden')

    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir menu de navegacion' }),
    )

    expect(navigation).not.toHaveClass('hidden')
    expect(navigation).toHaveClass('flex')
    expect(
      screen.getByRole('link', { name: 'Login' }),
    ).toBeInTheDocument()
  })

  it('navigates to pagos without reloading the page for an admin session', () => {
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        email: 'admin@sicose.test',
        rol: 'admin',
      }),
    )

    render(<RoutePills />)

    fireEvent.click(screen.getByRole('link', { name: 'Pagos' }))

    expect(window.location.pathname).toBe('/pagos')
  })
})
