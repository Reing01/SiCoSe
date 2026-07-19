import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, ApiError } from '../../../lib/api'
import { getCurrentUser, login } from '../auth.api'

describe('auth.api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts login credentials to the auth endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Login successful',
          data: {
            token: 'session-fixture',
            user: {
              email: 'admin@sicose.test',
              rol: 'admin',
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const response = await login({
      email: 'admin@sicose.test',
      password: 'SiCoSe2026!',
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)

    expect(url).toBe(`${API_BASE_URL}/api/auth/login`)
    expect(init.method).toBe('POST')
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(
      JSON.stringify({
        email: 'admin@sicose.test',
        password: 'SiCoSe2026!',
      }),
    )
    expect(response.data.token).toBe('session-fixture')
    expect(response.data.user.rol).toBe('admin')
  })

  it('throws a typed ApiError when the service rejects the request', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Invalid credentials',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const request = login({
      email: 'bad-email',
      password: '1234',
    })

    await expect(request).rejects.toBeInstanceOf(ApiError)

    await expect(request).rejects.toMatchObject({
      status: 400,
      message: 'Invalid credentials',
    })
  })

  it('rejects unsupported user roles from the auth response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            sub: 'user-1',
            email: 'admin@sicose.test',
            rol: 'superadmin',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    await expect(getCurrentUser('session-fixture')).rejects.toThrow(
      /confirmar la sesion/i,
    )
  })
})
