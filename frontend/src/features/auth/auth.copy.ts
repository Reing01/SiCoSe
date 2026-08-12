export const LOGIN_COPY = {
  fieldErrors: {
    emailRequired: 'Ingresa tu correo institucional.',
    emailInvalid: 'Ingresa un correo institucional válido.',
    passwordRequired: 'Ingresa tu contraseña.',
    passwordInvalid: 'Ingresa una contraseña válida.',
  },
  invalidFields: 'Corrige los campos marcados para continuar.',
  invalidFieldsToast: 'Revisa que tus datos estén completos antes de continuar.',
  submitting: 'Ingresando...',
  success: 'Sesión iniciada correctamente.',
  successTitle: 'Sesión iniciada',
  accessError: 'No pudimos iniciar sesión. Revisa tus datos o intenta más tarde.',
  accessErrorTitle: 'No se pudo iniciar sesión',
  incompleteTitle: 'Campos incompletos',
} as const

export function getPublicLoginErrorMessage() {
  return LOGIN_COPY.accessError
}
