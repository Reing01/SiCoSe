export type CitizenFieldName =
  | 'nombre'
  | 'apellido'
  | 'email'
  | 'telefono'
  | 'direccion'
  | 'claveCatastral'

export type CitizenFormValues = {
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
  claveCatastral: string
}

export type CitizenRecord = CitizenFormValues & {
  id: string
  createdAt: string
  updatedAt: string
}

export type CitizenFieldErrors = Partial<Record<CitizenFieldName, string>>

export type CitizenFilter = 'all' | 'complete' | 'attention'
