import { beforeEach, describe, expect, it } from 'vitest'
import {
  authStorageKeys,
  persistAuthSession,
  readAuthSession,
  clearAuthSession,
} from '../auth.session'

describe('auth.session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns null when the stored session user is malformed', () => {
    sessionStorage.setItem(authStorageKeys.token, 'token-demo')
    sessionStorage.setItem(authStorageKeys.user, 'null')

    expect(readAuthSession()).toBeNull()
  })

  it('returns null when the stored session user is missing required fields', () => {
    sessionStorage.setItem(authStorageKeys.token, 'token-demo')
    sessionStorage.setItem(authStorageKeys.user, JSON.stringify({ email: 'admin@sicose.test' }))

    expect(readAuthSession()).toBeNull()
  })

  it('returns null when the stored token is blank', () => {
    sessionStorage.setItem(authStorageKeys.token, '   ')
    sessionStorage.setItem(
      authStorageKeys.user,
      JSON.stringify({ email: 'admin@sicose.test', rol: 'admin' }),
    )

    expect(readAuthSession()).toBeNull()
  })

  it('round-trips a valid auth session', () => {
    persistAuthSession({
      token: 'token-demo',
      user: {
        email: 'admin@sicose.test',
        rol: 'admin',
      },
    })

    expect(readAuthSession()).toEqual({
      token: 'token-demo',
      user: {
        email: 'admin@sicose.test',
        rol: 'admin',
      },
    })
  })

  it('clears the persisted auth session', () => {
    persistAuthSession({
      token: 'token-demo',
      user: {
        email: 'admin@sicose.test',
        rol: 'admin',
      },
    })

    clearAuthSession()

    expect(sessionStorage.getItem(authStorageKeys.token)).toBeNull()
    expect(sessionStorage.getItem(authStorageKeys.user)).toBeNull()
  })
})
