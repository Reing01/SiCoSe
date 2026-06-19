import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LoginForm, { validateLoginForm } from '../LoginForm'

describe('validateLoginForm', () => {
  it('returns field errors for empty values', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'Ingresa tu correo institucional.',
      password: 'Ingresa tu contraseña.',
    })
  })

  it('accepts valid credentials', () => {
    expect(
      validateLoginForm({
        email: 'cristian@junta.gob.mx',
        password: 'SiCoSe2026!',
      }),
    ).toEqual({})
  })
})

describe('LoginForm', () => {
  it('shows validation feedback when the form is submitted empty', () => {
    render(<LoginForm />)

    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    expect(
      screen.getByText('Ingresa tu correo institucional.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /corrige los campos marcados/i,
    )
  })

  it('normalizes the email and calls onSubmit with valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      message: 'Sesión iniciada correctamente.',
    })

    render(
      <LoginForm
        onSubmit={onSubmit}
        initialValues={{
          email: 'ADMIN@JUNTA.GOB.MX',
          password: 'SiCoSe2026!',
        }}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'admin@junta.gob.mx',
        password: 'SiCoSe2026!',
      })
    })

    expect(await screen.findByRole('status')).toHaveTextContent(
      /sesión iniciada correctamente/i,
    )
  })

  it('toggles password visibility', () => {
    render(<LoginForm />)

    const passwordInput = screen.getByLabelText(/contraseña/i, {
      selector: 'input',
    })

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(
      screen.getByRole('button', { name: /mostrar contraseña/i }),
    )

    expect(
      screen.getByLabelText(/contraseña/i, { selector: 'input' }),
    ).toHaveAttribute('type', 'text')
  })
})

