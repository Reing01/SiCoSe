import type { AuthRole } from '../auth/auth.types'

export type SystemUserRole = AuthRole

export type SystemUserRecord = {
  id: string
  email: string
  nombre: string
  rol: SystemUserRole
  activo: boolean
  createdAt: string
  updatedAt: string
}

export type UserFormValues = {
  email: string
  nombre: string
  rol: SystemUserRole
  password: string
  activo: boolean
}

