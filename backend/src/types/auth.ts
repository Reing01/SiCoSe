import type { Request } from 'express'

export type UserRole = 'admin' | 'tesorero' | 'secretaria'

export type AuthenticatedUser = {
  id: string
  email: string
  rol: UserRole
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser
}
