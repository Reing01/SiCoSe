import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import RoutePills from '../RoutePills'

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
})
