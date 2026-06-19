import type { AuthSession, AuthUser } from './auth.types'

const AUTH_TOKEN_KEY = 'sicose.auth.token'
const AUTH_USER_KEY = 'sicose.auth.user'

function getStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}

export const authStorageKeys = {
  token: AUTH_TOKEN_KEY,
  user: AUTH_USER_KEY,
} as const

export function persistAuthSession(session: AuthSession) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(AUTH_TOKEN_KEY, session.token)
  storage.setItem(AUTH_USER_KEY, JSON.stringify(session.user))
}

export function clearAuthSession() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_TOKEN_KEY)
  storage.removeItem(AUTH_USER_KEY)
}

export function readAuthSession(): AuthSession | null {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  const token = storage.getItem(AUTH_TOKEN_KEY)
  const rawUser = storage.getItem(AUTH_USER_KEY)

  if (!token || !rawUser) {
    return null
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser

    return {
      token,
      user,
    }
  } catch {
    return null
  }
}

