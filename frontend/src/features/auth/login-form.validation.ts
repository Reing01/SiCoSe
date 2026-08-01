import { LOGIN_COPY } from './auth.copy'
import type { LoginRequest } from './auth.types'

export type LoginFieldName = keyof LoginRequest
export type LoginFieldErrors = Partial<Record<LoginFieldName, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

export function validateLoginForm(values: LoginRequest): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const email = values.email.trim()
  const password = values.password

  if (!email) errors.email = LOGIN_COPY.fieldErrors.emailRequired
  else if (!EMAIL_PATTERN.test(email))
    errors.email = LOGIN_COPY.fieldErrors.emailInvalid

  if (!password) errors.password = LOGIN_COPY.fieldErrors.passwordRequired
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = LOGIN_COPY.fieldErrors.passwordInvalid
  }

  return errors
}
