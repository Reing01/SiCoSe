const DEFAULT_BUCKET = 'comprobantes'

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_BUCKET

  return { bucket, serviceKey, supabaseUrl }
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function extractStorageObjectPath(sourceUrl, supabaseUrl, expectedBucket) {
  const source = new URL(sourceUrl)
  const supabaseOrigin = new URL(supabaseUrl).origin

  if (source.origin !== supabaseOrigin) {
    throw new Error('invalid-origin')
  }

  const prefix = `/storage/v1/object/${expectedBucket}/`

  if (!source.pathname.startsWith(prefix)) {
    throw new Error('invalid-storage-path')
  }

  const objectPath = decodeURIComponent(source.pathname.slice(prefix.length))
  const segments = objectPath.split('/').filter(Boolean)

  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    throw new Error('invalid-object-path')
  }

  return segments.join('/')
}

function buildSignUrl(supabaseUrl, bucket, objectPath) {
  const encodedPath = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`
}

function buildContentDisposition(objectPath) {
  const fileName = objectPath.split('/').pop() ?? 'reporte'
  const safeFileName = fileName.replace(/["\r\n]/g, '')

  return `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET')
    sendJson(response, 405, { error: 'Metodo no permitido.' })
    return
  }

  const { bucket, serviceKey, supabaseUrl } = getSupabaseConfig()

  if (!supabaseUrl || !serviceKey) {
    sendJson(response, 500, { error: 'Descarga no configurada.' })
    return
  }

  const rawUrl = Array.isArray(request.query.url)
    ? request.query.url[0]
    : request.query.url

  if (!rawUrl) {
    sendJson(response, 400, { error: 'Falta la URL del archivo.' })
    return
  }

  try {
    const objectPath = extractStorageObjectPath(rawUrl, supabaseUrl, bucket)
    const signResponse = await fetch(buildSignUrl(supabaseUrl, bucket, objectPath), {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 60 }),
    })

    if (!signResponse.ok) {
      sendJson(response, 502, { error: 'No fue posible preparar la descarga.' })
      return
    }

    const payload = await signResponse.json()
    const signedPath = payload.signedURL ?? payload.signedUrl

    if (!signedPath) {
      sendJson(response, 502, { error: 'No fue posible preparar la descarga.' })
      return
    }

    const signedUrl = signedPath.startsWith('http')
      ? signedPath
      : `${supabaseUrl}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`
    const fileResponse = await fetch(signedUrl)

    if (!fileResponse.ok) {
      sendJson(response, 502, { error: 'No fue posible descargar el archivo.' })
      return
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
    response.statusCode = 200
    response.setHeader(
      'content-type',
      fileResponse.headers.get('content-type') ?? 'application/octet-stream',
    )
    response.setHeader('content-disposition', buildContentDisposition(objectPath))
    response.setHeader('cache-control', 'no-store')
    response.end(fileBuffer)
  } catch {
    sendJson(response, 400, { error: 'URL de archivo invalida.' })
  }
}
