import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authStorageKeys,
  readAuthSession,
} from '../../features/auth/auth.session'
import { API_BASE_URL, ApiError, apiRequest } from '../api'

function persistSession(token = 'expired-token') {
  window.sessionStorage.setItem(authStorageKeys.token, token)
  window.sessionStorage.setItem(
    authStorageKeys.user,
    JSON.stringify({
      email: 'admin@sicose.test',
      rol: 'admin',
    }),
  )
}

describe('apiRequest authentication recovery', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/login')
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes an expired access token and retries the original request', async () => {
    persistSession()
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: 'Invalid or expired token' }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { token: 'renewed-token' } }),
      )
      .mockResolvedValueOnce(Response.json({ data: { ok: true } }))

    const response = await apiRequest<{ data: { ok: boolean } }>(
      '/api/protected',
      {
        headers: { Authorization: 'Bearer expired-token' },
      },
    )

    expect(response.data.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/api/auth/refresh`)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })

    const retryHeaders = new Headers(fetchMock.mock.calls[2][1].headers)
    expect(retryHeaders.get('Authorization')).toBe('Bearer renewed-token')
    expect(readAuthSession()?.token).toBe('renewed-token')
  })

  it('clears the session when the refresh token is rejected', async () => {
    persistSession()
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: 'Invalid or expired token' }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: 'Invalid refresh token' }, { status: 401 }),
      )

    await expect(
      apiRequest('/api/protected', {
        headers: { Authorization: 'Bearer expired-token' },
      }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(readAuthSession()).toBeNull()
  })

  it('does not attempt refresh for invalid login credentials', async () => {
    persistSession()
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: 'Invalid email or password' }, { status: 401 }),
    )

    await expect(
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'bad@test', password: 'bad-password' },
      }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(readAuthSession()?.token).toBe('expired-token')
  })
})
