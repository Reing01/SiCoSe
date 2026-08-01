import type { CitizenFieldErrors, CitizenFormValues } from './citizen.types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+]?[\d\s()-]{7,}$/
const CATASTRAL_PATTERN = /^[A-Z0-9-]{6,}$/

export function normalizeCitizenForm(
  values: CitizenFormValues,
): CitizenFormValues {
  return {
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    email: values.email.trim().toLowerCase(),
    telefono: values.telefono.trim(),
    direccion: values.direccion.trim(),
    claveCatastral: values.claveCatastral.trim().toUpperCase(),
  }
}

export function validateCitizenForm(
  values: CitizenFormValues,
): CitizenFieldErrors {
  const normalized = normalizeCitizenForm(values)
  const errors: CitizenFieldErrors = {}

  if (normalized.nombre.length < 2) errors.nombre = 'Ingresa un nombre valido.'
  if (normalized.apellido.length < 2)
    errors.apellido = 'Ingresa un apellido valido.'

  if (!normalized.email) errors.email = 'Ingresa un correo electronico.'
  else if (!EMAIL_PATTERN.test(normalized.email))
    errors.email = 'Ingresa un correo valido.'

  if (normalized.telefono && !PHONE_PATTERN.test(normalized.telefono)) {
    errors.telefono = 'Ingresa un telefono valido o deja el campo vacio.'
  }

  if (normalized.direccion && normalized.direccion.length < 6) {
    errors.direccion = 'La direccion debe tener al menos 6 caracteres.'
  }

  if (!normalized.claveCatastral)
    errors.claveCatastral = 'Ingresa la clave catastral.'
  else if (!CATASTRAL_PATTERN.test(normalized.claveCatastral)) {
    errors.claveCatastral =
      'Usa al menos 6 caracteres con letras, numeros o guiones.'
  }

  return errors
}
