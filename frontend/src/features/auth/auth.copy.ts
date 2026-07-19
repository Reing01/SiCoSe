export const LOGIN_COPY = {
  fieldErrors: {
    emailRequired: 'Ingresa tu correo institucional.',
    emailInvalid: 'Ingresa un correo institucional valido.',
    passwordRequired: 'Ingresa tu contrasena.',
    passwordInvalid: 'Ingresa una contrasena valida.',
  },
  invalidFields: 'Corrige los campos marcados para continuar.',
  invalidFieldsToast: 'Revisa que tus datos esten completos antes de continuar.',
  submitting: 'Ingresando...',
  success: 'Sesion iniciada correctamente.',
  successTitle: 'Sesion iniciada',
  accessError: 'No pudimos iniciar sesion. Revisa tus datos o intenta mas tarde.',
  accessErrorTitle: 'No se pudo iniciar sesion',
  incompleteTitle: 'Campos incompletos',
} as const

export function getPublicLoginErrorMessage() {
  return LOGIN_COPY.accessError
}
