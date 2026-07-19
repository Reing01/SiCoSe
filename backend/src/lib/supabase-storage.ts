import { env } from '../config/env.js'

export type UploadStorageInput = {
  path: string
  buffer: Buffer
  contentType: string
}

export type UploadStorageResult = {
  bucket: string
  path: string
  url: string
}

type SignedUrlResponse = {
  signedURL?: string
  signedUrl?: string
}

function getStorageConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase Storage environment variables are not configured')
  }

  return {
    supabaseUrl: env.SUPABASE_URL.replace(/\/$/, ''),
    serviceKey: env.SUPABASE_SERVICE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET,
  }
}

export async function uploadPrivateStorageObject(
  input: UploadStorageInput,
): Promise<UploadStorageResult> {
  const { supabaseUrl, serviceKey, bucket } = getStorageConfig()
  const objectPath = input.path.replace(/^\/+/, '')
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': input.contentType,
      'x-upsert': 'false',
    },
    // Preserve the Buffer view boundaries; its backing ArrayBuffer may contain
    // unrelated bytes outside this object's byteOffset and byteLength.
    body: new Uint8Array(
      input.buffer.buffer,
      input.buffer.byteOffset,
      input.buffer.byteLength,
    ) as unknown as BodyInit,
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Supabase Storage upload failed: ${response.status} ${details}`,
    )
  }

  return {
    bucket,
    path: objectPath,
    url: `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${objectPath}`,
  }
}

export async function createPrivateStorageSignedUrl(
  path: string,
  expiresInSeconds = 300,
) {
  const { supabaseUrl, serviceKey, bucket } = getStorageConfig()
  const objectPath = path.replace(/^\/+/, '')
  const signUrl = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${objectPath}`
  const response = await fetch(signUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      `Supabase Storage signing failed: ${response.status} ${details}`,
    )
  }

  const payload = (await response.json()) as SignedUrlResponse
  const signedPath = payload.signedURL ?? payload.signedUrl

  if (!signedPath) {
    throw new Error('Supabase Storage did not return a signed URL')
  }

  const signedUrl = signedPath.startsWith('http')
    ? signedPath
    : `${supabaseUrl}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`
  const fileName = objectPath.split('/').pop() ?? 'archivo'
  const separator = signedUrl.includes('?') ? '&' : '?'

  return `${signedUrl}${separator}download=${encodeURIComponent(fileName)}`
}

export const uploadPrivateReceipt = uploadPrivateStorageObject
