import {
  clearAuthSession,
  persistAuthSession,
  readAuthSession,
} from '../features/auth/auth.session'
import { navigateTo } from './navigation'
import {
  buildJsonCacheKey,
  enqueueOfflineRequest,
  listQueuedRequests,
  OfflineQueueError,
  prepareRequestBody,
  readCachedJsonResponse,
  removeQueuedRequest,
  incrementQueuedRequestAttempts,
  serializeQueuedBody,
  storeCachedJsonResponse,
} from './offline-sync'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

const DEFAULT_PRODUCTION_API_BASE_URL = import.meta.env.PROD
  ? 'https://sicose-24pj.onrender.com'
  : ''

export const RESOLVED_API_BASE_URL =
  API_BASE_URL || DEFAULT_PRODUCTION_API_BASE_URL

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

type RefreshResponse = {
  data?: {
    token?: string
  }
}

type RequestOptions = {
  allowOfflineQueue?: boolean
}

let refreshRequest: Promise<string | null> | null = null
let syncRequest: Promise<void> | null = null

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${RESOLVED_API_BASE_URL}${normalizedPath}`
}

function isAuthPath(path: string, action: 'login' | 'refresh' | 'logout') {
  return path.replace(/\/+$/, '').endsWith(`/api/auth/${action}`)
}

function redirectToLogin() {
  clearAuthSession()

  if (
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') !== '/login'
  ) {
    navigateTo('/login', true)
  }
}

async function requestNewAccessToken(): Promise<string | null> {
  const session = readAuthSession()

  if (!session) {
    return null
  }

  try {
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
  } catch {
    return null
  }
}

async function refreshAccessToken() {
  refreshRequest ??= requestNewAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
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

function shouldQueueRequest(path: string, method: string, canQueueBody: boolean) {
  return (
    canQueueBody &&
    !isAuthPath(path, 'login') &&
    !isAuthPath(path, 'refresh') &&
    !isAuthPath(path, 'logout') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  )
}

async function executeRequest<T>(
  path: string,
  init: ApiRequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  const method = (init.method ?? 'GET').toUpperCase()
  const preparedBody = await prepareRequestBody(init.body)
  const body = preparedBody.body

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (body != null && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const cacheKey = buildJsonCacheKey(path, headers.get('Authorization'))

  const executeFetch = () =>
    fetch(buildUrl(path), {
      ...init,
      body,
      credentials: init.credentials ?? 'include',
      headers,
      method,
    })

  let response: Response

  try {
    response = await executeFetch()
  } catch (error) {
    if (method === 'GET') {
      const cachedResponse = await readCachedJsonResponse(cacheKey)

      if (cachedResponse) {
        try {
          return JSON.parse(cachedResponse.body) as T
        } catch {
          // Si el caché quedó corrupto, seguimos con el error original.
        }
      }
    }

    const canQueue = options.allowOfflineQueue ?? true

    if (
      canQueue &&
      preparedBody.canQueue &&
      shouldQueueRequest(path, method, preparedBody.canQueue) &&
      (typeof navigator === 'undefined' || !navigator.onLine || error instanceof TypeError)
    ) {
      const queuedRequest = await enqueueOfflineRequest({
        path,
        method,
        headers: Array.from(headers.entries()),
        body: preparedBody.serializedBody,
      })

      throw new OfflineQueueError(queuedRequest.id)
    }

    throw new ApiError(
      0,
      error instanceof Error
        ? error.message
        : 'No fue posible conectar con el servidor.',
    )
  }

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
      response = await executeFetch()
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

  const rawBody = await response.text()

  if (method === 'GET') {
    await storeCachedJsonResponse(cacheKey, rawBody)
  }

  return JSON.parse(rawBody) as T
}

async function replayQueuedRequests() {
  if (syncRequest) {
    return syncRequest
  }

  syncRequest = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }

    const queuedRequests = await listQueuedRequests()

    for (const queuedRequest of queuedRequests) {
      try {
        const replayHeaders = new Headers(queuedRequest.headers)
        const replayBody = await serializeQueuedBody(queuedRequest.body)

        await executeRequest(queuedRequest.path, {
          method: queuedRequest.method,
          headers: replayHeaders,
          body: replayBody,
        }, {
          allowOfflineQueue: false,
        })

        await removeQueuedRequest(queuedRequest.id)
      } catch (error) {
        await incrementQueuedRequestAttempts(queuedRequest.id)

        if (error instanceof OfflineQueueError) {
          continue
        }

        break
      }
    }
  })()
    .catch(() => {
      // No hacemos ruido por errores de sincronización en segundo plano.
    })
    .finally(() => {
      syncRequest = null
    })

  return syncRequest
}

export function startOfflineSync() {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleOnline = () => {
    void replayQueuedRequests()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('focus', handleOnline)

  void replayQueuedRequests()

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('focus', handleOnline)
  }
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  return executeRequest<T>(path, init)
}
