export type AuthRole = 'admin' | 'tesorero' | 'secretaria'

export type LoginRequest = {
  email: string
  password: string
}

export type AuthUser = {
  email: string
  rol: AuthRole
}

export type AuthSession = {
  token: string
  user: AuthUser
}

export type LoginResponse = {
  message: string
  data: AuthSession
}

export type AuthMeResponse = {
  data: {
    sub: string
    email: string
    rol: AuthRole
  }
}

