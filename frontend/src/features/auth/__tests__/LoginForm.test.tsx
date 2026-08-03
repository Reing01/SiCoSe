import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LOGIN_COPY } from '../auth.copy'
import LoginForm from '../LoginForm'
import { validateLoginForm } from '../login-form.validation'

describe('validateLoginForm', () => {
  it('returns field errors for empty values', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: LOGIN_COPY.fieldErrors.emailRequired,
      password: LOGIN_COPY.fieldErrors.passwordRequired,
    })
  })

  it('accepts valid credentials', () => {
    expect(
      validateLoginForm({
        email: 'admin@sicose.test',
        password: 'SiCoSe2026!',
      }),
    ).toEqual({})
  })

  it('does not trim password characters during validation', () => {
    expect(
      validateLoginForm({
        email: 'admin@sicose.test',
        password: '  SiCoSe2026!  ',
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
    expect(
      screen.getByText(LOGIN_COPY.fieldErrors.passwordRequired),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /corrige los campos marcados/i,
    )
  })

  it('normalizes the email and calls onSubmit with valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      message: LOGIN_COPY.success,
    })

    render(
      <LoginForm
        onSubmit={onSubmit}
        initialValues={{
          email: 'ADMIN@SICOSE.TEST',
          password: 'SiCoSe2026!',
        }}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'admin@sicose.test',
        password: 'SiCoSe2026!',
      })
    })

    expect(await screen.findByRole('status')).toHaveTextContent(
      /sesion iniciada correctamente/i,
    )
  })

  it('shows a public error when access is rejected', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('private diagnostic: invalid grant'))

    render(
      <LoginForm
        onSubmit={onSubmit}
        initialValues={{
          email: 'admin@sicose.test',
          password: 'SiCoSe2026!',
        }}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /ingresar al panel/i }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      LOGIN_COPY.accessError,
    )
    expect(screen.queryByText(/private diagnostic/i)).not.toBeInTheDocument()
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
