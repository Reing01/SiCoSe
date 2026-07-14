export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? '/api'
).replace(/\/+$/, '')

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
    !(
      typeof ReadableStream !== 'undefined' &&
      body instanceof ReadableStream
    )
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

  if (body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    body,
    headers,
  })

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    const message =
      payload?.error ??
      payload?.message ??
      `Request failed with status ${response.status}`

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
