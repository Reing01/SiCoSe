import { apiRequest } from '../../lib/api'
import { OfflineQueueError } from '../../lib/offline-sync'
import type {
  CitizenFormValues,
  CitizenPageMetadata,
  CitizenRecord,
} from './citizen.types'

type CitizenApiRecord = {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  direccion: string | null
  zona: string | null
  clave_catastral: string
  activo: boolean
  created_at: string
  updated_at: string
}

type CitizenListResponse = {
  data: CitizenApiRecord[]
  metadata: CitizenPageMetadata
}

type CitizenResponse = {
  data: CitizenApiRecord
}

function toCitizenRecord(record: CitizenApiRecord): CitizenRecord {
  return {
    id: record.id,
    nombre: record.nombre,
    apellido: record.apellido,
    email: record.email,
    telefono: record.telefono ?? '',
    direccion: record.direccion ?? '',
    claveCatastral: record.clave_catastral,
    activo: record.activo ?? true,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}

function toApiPayload(values: CitizenFormValues) {
  return {
    nombre: values.nombre,
    apellido: values.apellido,
    email: values.email,
    telefono: values.telefono || undefined,
    direccion: values.direccion || undefined,
    clave_catastral: values.claveCatastral,
  }
}

function createProvisionalCitizenRecord(
  values: CitizenFormValues,
  existingId?: string,
): CitizenRecord {
  const now = new Date().toISOString()

  return {
    id: existingId ?? `local-citizen-${Date.now()}`,
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    email: values.email.trim(),
    telefono: values.telefono.trim(),
    direccion: values.direccion.trim(),
    claveCatastral: values.claveCatastral.trim(),
    activo: true,
    createdAt: now,
    updatedAt: now,
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchCitizens(token: string): Promise<CitizenRecord[]> {
  const records: CitizenApiRecord[] = []
  let page = 1

  while (true) {
    const response = await apiRequest<CitizenListResponse>(
      `/api/ciudadanos?pagina=${page}&limite=100`,
      {
        headers: authHeaders(token),
      },
    )

    records.push(...response.data)
    if (page >= response.metadata.totalPaginas) {
      break
    }
    page += 1
  }

  return records.map(toCitizenRecord)
}

export async function fetchCitizenPage(
  token: string,
  {
    pagina,
    limite,
    nombre,
    incluirInactivos = true,
  }: {
    pagina: number
    limite: number
    nombre?: string
    incluirInactivos?: boolean
  },
): Promise<{ records: CitizenRecord[]; metadata: CitizenPageMetadata }> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
    incluir_inactivos: String(incluirInactivos),
  })

  if (nombre?.trim()) {
    params.set('nombre', nombre.trim())
  }

  const response = await apiRequest<CitizenListResponse>(
    `/api/ciudadanos?${params.toString()}`,
    {
      headers: authHeaders(token),
    },
  )

  return {
    records: response.data.map(toCitizenRecord),
    metadata: response.metadata,
  }
}

export async function createCitizen(
  token: string,
  values: CitizenFormValues,
): Promise<CitizenRecord> {
  try {
    const response = await apiRequest<CitizenResponse>('/api/ciudadanos', {
      method: 'POST',
      headers: authHeaders(token),
      body: toApiPayload(values),
    })

    return toCitizenRecord(response.data)
  } catch (error) {
    if (error instanceof OfflineQueueError) {
      return createProvisionalCitizenRecord(values)
    }

    throw error
  }
}

export async function updateCitizen(
  token: string,
  id: string,
  values: CitizenFormValues,
): Promise<CitizenRecord> {
  try {
    const response = await apiRequest<CitizenResponse>(
      `/api/ciudadanos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: authHeaders(token),
        body: toApiPayload(values),
      },
    )

    return toCitizenRecord(response.data)
  } catch (error) {
    if (error instanceof OfflineQueueError) {
      return createProvisionalCitizenRecord(values, id)
    }

    throw error
  }
}

export async function deactivateCitizen(
  token: string,
  id: string,
): Promise<void> {
  try {
    await apiRequest<CitizenResponse>(
      `/api/ciudadanos/${encodeURIComponent(id)}/desactivar`,
      {
        method: 'PUT',
        headers: authHeaders(token),
      },
    )
  } catch (error) {
    if (error instanceof OfflineQueueError) {
      return
    }

    throw error
  }
}
