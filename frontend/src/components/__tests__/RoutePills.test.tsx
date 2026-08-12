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
      name: 'Navegación de pantallas',
    })

    expect(navigation).toHaveClass('hidden')

    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir menú de navegación' }),
    )

    expect(navigation).not.toHaveClass('hidden')
    expect(navigation).toHaveClass('grid')
    expect(
      screen.getByRole('link', { name: 'Login' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('muestra las rutas protegidas disponibles para una sesion admin', () => {
    window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
    window.sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({
        email: 'admin@sicose.test',
        rol: 'admin',
      }),
    )

    render(<RoutePills />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir menú de navegación' }),
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ciudadanos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pagos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument()
  })
})
