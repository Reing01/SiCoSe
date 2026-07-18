import {
  clearAuthSession,
  persistAuthSession,
  readAuthSession,
} from '../features/auth/auth.session'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
)

export type ApiErrorPayload = {
  error?: string
  message?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type JsonRequestBody = Record<string, unknown> | unknown[]

type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | JsonRequestBody | null
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

type RefreshResponse = {
  data?: {
    token?: string
  }
}

let refreshRequest: Promise<string | null> | null = null

function isAuthPath(path: string, action: 'login' | 'refresh' | 'logout') {
  return path.replace(/\/+$/, '').endsWith(`/api/auth/${action}`)
}

function redirectToLogin() {
  clearAuthSession()

  if (
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') !== '/login'
  ) {
    window.location.assign('/login')
  }
}

async function requestNewAccessToken(): Promise<string | null> {
  const session = readAuthSession()

  if (!session) {
    return null
  }

  const response = await fetch(buildUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as RefreshResponse
  const token = payload.data?.token

  if (!token?.trim()) {
    return null
  }

  persistAuthSession({
    ...session,
    token,
  })

  return token
}

async function refreshAccessToken() {
  refreshRequest ??= requestNewAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

function isJsonRequestBody(body: unknown): body is JsonRequestBody {
  if (body == null || typeof body !== 'object') {
    return false
  }

  return (
    !(body instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(body) &&
    !(body instanceof Blob) &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
  )
}

function serializeRequestBody(body: ApiRequestInit['body']) {
  if (isJsonRequestBody(body)) {
    return JSON.stringify(body)
  }

  return body
}

async function readErrorPayload(
  response: Response,
): Promise<ApiErrorPayload | undefined> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return undefined
  }

  try {
    return (await response.json()) as ApiErrorPayload
  } catch {
    return undefined
  }
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  const body = serializeRequestBody(init.body)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (body != null && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const executeRequest = () =>
    fetch(buildUrl(path), {
      ...init,
      body,
      credentials: init.credentials ?? 'include',
      headers,
    })

  let response = await executeRequest()

  const canRefresh =
    response.status === 401 &&
    headers.has('Authorization') &&
    !isAuthPath(path, 'login') &&
    !isAuthPath(path, 'refresh') &&
    !isAuthPath(path, 'logout')

  if (canRefresh) {
    const token = await refreshAccessToken()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      response = await executeRequest()
    } else {
      redirectToLogin()
    }
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    const message =
      payload?.error ??
      payload?.message ??
      `Request failed with status ${response.status}`

    if (response.status === 401 && !isAuthPath(path, 'login')) {
      redirectToLogin()
    }

    throw new ApiError(response.status, message, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  return (await response.json()) as T
}
