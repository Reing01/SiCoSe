function buildDownloadUrls(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl)

    if (
      parsedUrl.hostname.endsWith('.supabase.co') &&
      parsedUrl.pathname.startsWith('/storage/v1/object/')
    ) {
      return [`/api/storage-download?url=${encodeURIComponent(sourceUrl)}`, sourceUrl]
    }
  } catch {
    // Si la URL no es absoluta, dejamos que el intento original falle de forma controlada.
  }

  return [sourceUrl]
}

async function fetchBlobResponse(sourceUrl: string) {
  let lastResponse: Response | null = null

  for (const url of buildDownloadUrls(sourceUrl)) {
    const response = await fetch(url)
    lastResponse = response

    if (response.ok) {
      return response
    }
  }

  return lastResponse
}

export async function fetchGeneratedFile(sourceUrl: string) {
  return fetchBlobResponse(sourceUrl)
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
