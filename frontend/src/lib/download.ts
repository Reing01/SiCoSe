import { API_BASE_URL } from './api'

const DOWNLOAD_BASE_URL = (
  API_BASE_URL || (import.meta.env.PROD ? 'https://sicose-24pj.onrender.com' : '')
).trim().replace(/\/+$/, '')

function buildDownloadUrls(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl)

    if (
      parsedUrl.hostname.endsWith('.supabase.co') &&
      parsedUrl.pathname.startsWith('/storage/v1/object/')
    ) {
      const downloadUrl = DOWNLOAD_BASE_URL
        ? `${DOWNLOAD_BASE_URL}/api/storage-download?url=${encodeURIComponent(sourceUrl)}`
        : `/api/storage-download?url=${encodeURIComponent(sourceUrl)}`

      return [downloadUrl, sourceUrl]
    }
  } catch {
    // Si la URL no es absoluta, dejamos que el intento original falle de forma controlada.
  }

  return [sourceUrl]
}

async function fetchBlobResponse(sourceUrl: string, token?: string) {
  let lastResponse: Response | null = null

  for (const url of buildDownloadUrls(sourceUrl)) {
    const response = await fetch(url, {
      credentials: url.startsWith('/api/') ? 'include' : 'omit',
      headers:
        url.startsWith('/api/storage-download') && token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
    })
    lastResponse = response

    if (response.ok) {
      return response
    }
  }

  return lastResponse
}

export async function fetchGeneratedFile(sourceUrl: string, token?: string) {
  return fetchBlobResponse(sourceUrl, token)
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function openBlobInNewTab(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.target = '_blank'
  anchor.rel = 'noreferrer'
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
