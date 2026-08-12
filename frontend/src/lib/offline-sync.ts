type SerializedTextBody = {
  kind: 'text'
  value: string
}

type SerializedFileValue = {
  kind: 'file'
  name: string
  mimeType: string | null
  data: string
}

type SerializedFormEntryValue =
  | { kind: 'text'; value: string }
  | SerializedFileValue

type SerializedFormDataBody = {
  kind: 'form-data'
  entries: Array<{
    key: string
    value: SerializedFormEntryValue
  }>
}

type SerializedNoneBody = {
  kind: 'none'
}

export type SerializedRequestBody =
  | SerializedNoneBody
  | SerializedTextBody
  | SerializedFormDataBody

export type OfflineQueuedRequest = {
  id: string
  path: string
  method: string
  headers: Array<[string, string]>
  body: SerializedRequestBody
  createdAt: number
  attempts: number
}

type CachedJsonResponse = {
  key: string
  body: string
  createdAt: number
}

type PreparedBody = {
  body: BodyInit | undefined
  serializedBody: SerializedRequestBody
  canQueue: boolean
}

const DATABASE_NAME = 'sicose-offline-sync'
const DATABASE_VERSION = 1
const QUEUE_STORE_NAME = 'queued-requests'
const CACHE_STORE_NAME = 'json-response-cache'

const queuedRequestsMemory: OfflineQueuedRequest[] = []
const cachedResponsesMemory = new Map<string, CachedJsonResponse>()

let databasePromise: Promise<IDBDatabase | null> | null = null

export class OfflineQueueError extends Error {
  requestId: string

  constructor(requestId: string) {
    super('La solicitud fue guardada para sincronizarse más tarde.')
    this.name = 'OfflineQueueError'
    this.requestId = requestId
  }
}

function supportsIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0)
  }

  return btoa(binary)
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

function openDatabase() {
  if (!supportsIndexedDb()) {
    return Promise.resolve(null)
  }

  databasePromise ??= new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        database.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
        database.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('No se pudo abrir la base offline.'))
    }
  }).catch(() => null) as Promise<IDBDatabase | null>

  return databasePromise
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  return arrayBufferToBase64(buffer)
}

function bodyFromText(value: string): SerializedTextBody {
  return { kind: 'text', value }
}

function isJsonObjectBody(body: unknown) {
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

export async function prepareRequestBody(body: unknown): Promise<PreparedBody> {
  if (body == null) {
    return {
      body: undefined,
      serializedBody: { kind: 'none' },
      canQueue: true,
    }
  }

  if (body instanceof FormData) {
    const entries: SerializedFormDataBody['entries'] = []

    for (const [key, value] of body.entries()) {
      if (typeof value === 'string') {
        entries.push({ key, value: { kind: 'text', value } })
        continue
      }

      const blob = value as Blob
      const fileLike = blob

      entries.push({
        key,
        value: {
          kind: 'file',
          name:
            typeof File !== 'undefined' && value instanceof File && value.name.trim()
              ? value.name
              : 'blob',
          mimeType: blob.type || null,
          data: await blobToBase64(fileLike),
        },
      })
    }

    return {
      body,
      serializedBody: { kind: 'form-data', entries },
      canQueue: true,
    }
  }

  if (body instanceof URLSearchParams) {
    const text = body.toString()

    return {
      body: text,
      serializedBody: bodyFromText(text),
      canQueue: true,
    }
  }

  if (typeof body === 'string') {
    return {
      body,
      serializedBody: bodyFromText(body),
      canQueue: true,
    }
  }

  if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return {
      body: body as BodyInit,
      serializedBody: { kind: 'none' },
      canQueue: false,
    }
  }

  if (isJsonObjectBody(body)) {
    const text = JSON.stringify(body)

    return {
      body: text,
      serializedBody: bodyFromText(text),
      canQueue: true,
    }
  }

  return {
    body: String(body),
    serializedBody: bodyFromText(String(body)),
    canQueue: true,
  }
}

export async function serializeQueuedBody(
  body: SerializedRequestBody,
): Promise<BodyInit | undefined> {
  if (body.kind === 'none') {
    return undefined
  }

  if (body.kind === 'text') {
    return body.value
  }

  const formData = new FormData()

  for (const entry of body.entries) {
    if (entry.value.kind === 'text') {
      formData.append(entry.key, entry.value.value)
      continue
    }

    const arrayBuffer = base64ToArrayBuffer(entry.value.data)
    const blob = new Blob([arrayBuffer], {
      type: entry.value.mimeType ?? 'application/octet-stream',
    })

    if (typeof File !== 'undefined') {
      const file = new File([blob], entry.value.name, { type: blob.type })
      formData.append(entry.key, file)
    } else {
      formData.append(entry.key, blob, entry.value.name)
    }
  }

  return formData
}

export async function enqueueOfflineRequest(
  request: Omit<OfflineQueuedRequest, 'id' | 'createdAt' | 'attempts'>,
) {
  const queuedRequest: OfflineQueuedRequest = {
    ...request,
    id: createRequestId(),
    createdAt: Date.now(),
    attempts: 0,
  }

  const database = await openDatabase()

  if (!database) {
    queuedRequestsMemory.push(queuedRequest)
    return queuedRequest
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(QUEUE_STORE_NAME, 'readwrite')
    transaction.objectStore(QUEUE_STORE_NAME).put(queuedRequest)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('No se pudo guardar la solicitud offline.'))
    }
  })

  return queuedRequest
}

export async function listQueuedRequests() {
  const database = await openDatabase()

  if (!database) {
    return [...queuedRequestsMemory].sort(
      (left, right) => left.createdAt - right.createdAt,
    )
  }

  return new Promise<OfflineQueuedRequest[]>((resolve, reject) => {
    const transaction = database.transaction(QUEUE_STORE_NAME, 'readonly')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(
        (request.result as OfflineQueuedRequest[]).sort(
          (left, right) => left.createdAt - right.createdAt,
        ),
      )
    }

    request.onerror = () => {
      reject(request.error ?? new Error('No se pudo leer la cola offline.'))
    }
  })
}

export async function removeQueuedRequest(id: string) {
  const database = await openDatabase()

  if (!database) {
    const index = queuedRequestsMemory.findIndex((entry) => entry.id === id)
    if (index >= 0) {
      queuedRequestsMemory.splice(index, 1)
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(QUEUE_STORE_NAME, 'readwrite')
    transaction.objectStore(QUEUE_STORE_NAME).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('No se pudo eliminar la solicitud offline.'))
    }
  })
}

export async function incrementQueuedRequestAttempts(id: string) {
  const database = await openDatabase()

  if (!database) {
    const entry = queuedRequestsMemory.find((item) => item.id === id)
    if (entry) {
      entry.attempts += 1
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(QUEUE_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => {
      const entry = request.result as OfflineQueuedRequest | undefined
      if (!entry) {
        resolve()
        return
      }

      entry.attempts += 1
      store.put(entry)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('No se pudo actualizar la solicitud offline.'))
    }
  })
}

export async function storeCachedJsonResponse(key: string, body: string) {
  const cachedResponse: CachedJsonResponse = {
    key,
    body,
    createdAt: Date.now(),
  }

  const database = await openDatabase()

  if (!database) {
    cachedResponsesMemory.set(key, cachedResponse)
    return cachedResponse
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE_NAME, 'readwrite')
    transaction.objectStore(CACHE_STORE_NAME).put(cachedResponse)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('No se pudo guardar la respuesta en caché.'))
    }
  })

  return cachedResponse
}

export async function readCachedJsonResponse(key: string) {
  const database = await openDatabase()

  if (!database) {
    return cachedResponsesMemory.get(key) ?? null
  }

  return new Promise<CachedJsonResponse | null>((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE_NAME, 'readonly')
    const store = transaction.objectStore(CACHE_STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => {
      resolve((request.result as CachedJsonResponse | undefined) ?? null)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('No se pudo leer la caché de respuestas.'))
    }
  })
}

export function buildJsonCacheKey(path: string, authorizationHeader: string | null) {
  return `${path}::${authorizationHeader?.trim() || 'anonymous'}`
}
