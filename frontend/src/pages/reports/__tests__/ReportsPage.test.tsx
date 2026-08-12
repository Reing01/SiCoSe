import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../../features/theme/theme'
import { authStorageKeys } from '../../../features/auth/auth.session'
import ReportsPage from '../ReportsPage'

function persistSession() {
  window.sessionStorage.setItem(authStorageKeys.token, 'test-token')
  window.sessionStorage.setItem(
    authStorageKeys.user,
    JSON.stringify({
      email: 'tesorero@sicose.test',
      rol: 'tesorero',
    }),
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    persistSession()
    window.history.replaceState({}, '', '/reportes')
  })

  it('separa los flujos individuales y generales de reportes', () => {
    render(
      <ThemeProvider>
        <ReportsPage />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('button', { name: /general/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /individual/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /individual/i }))

    expect(
      screen.getByRole('heading', { name: /comprobante individual/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /flujo individual/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /ir a pagos/i }),
    ).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /general/i }))

    expect(
      screen.getByRole('heading', { name: /generación y exportación/i }),
    ).toBeInTheDocument()
  })
})
