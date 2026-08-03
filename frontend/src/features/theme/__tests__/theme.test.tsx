import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from '../theme-context'
import { ThemeProvider } from '../theme'

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <span>{theme}</span>
      <button type="button" onClick={toggleTheme}>
        Toggle
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  afterEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  it('falls back to light theme when storage is unavailable', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    try {
      render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      )

      expect(screen.getByText('light')).toBeInTheDocument()
      expect(document.documentElement.dataset.theme).toBe('light')
    } finally {
      getItemSpy.mockRestore()
      setItemSpy.mockRestore()
    }
  })

  it('persists the selected theme when storage works', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('light')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /toggle/i }))

    expect(screen.getByText('dark')).toBeInTheDocument()
    expect(window.localStorage.getItem('sicose-theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
