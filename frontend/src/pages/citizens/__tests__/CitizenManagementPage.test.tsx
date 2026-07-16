import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '../../../features/theme/theme'
import CitizenManagementPage from '../CitizenManagementPage'

describe('CitizenManagementPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  it('renders the management hero and panel', () => {
    render(
      <ThemeProvider>
        <CitizenManagementPage />
      </ThemeProvider>,
    )

    expect(
      screen.getByRole('heading', {
        name: /gesti[oó]n de ciudadanos con b[uú]squeda, edici[oó]n y control de datos/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/sicose - padr[oó]n digital/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nuevo ciudadano/i }),
    ).toBeInTheDocument()
  })

  it('uses the shared theme toggle instead of a page-local theme key', () => {
    render(
      <ThemeProvider>
        <CitizenManagementPage />
      </ThemeProvider>,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /cambiar a tema oscuro/i }),
    )

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('sicose-theme')).toBe('dark')
    expect(window.localStorage.getItem('theme-citizen')).toBeNull()
  })
})
