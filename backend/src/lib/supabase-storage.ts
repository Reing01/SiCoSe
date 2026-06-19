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
    body: new Uint8Array(input.buffer),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Supabase Storage upload failed: ${response.status} ${details}`)
  }

  return {
    bucket,
    path: objectPath,
    url: `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
  }
}

export const uploadPrivateReceipt = uploadPrivateStorageObject
